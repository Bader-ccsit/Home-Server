import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { Repository } from 'typeorm'
import { PasteMeEntry } from '../../entities/pasteme-entry.entity'
import { User } from '../../entities/user.entity'

const TEXT_TTL_MS = 2 * 60 * 60 * 1000
const FILE_TTL_MS = 20 * 60 * 1000

@Injectable()
export class PasteMeService {
  private readonly storageRoot = path.resolve(process.cwd(), 'services', 'pasteme')
  private readonly filesDir = path.join(this.storageRoot, 'files')

  constructor(
    @InjectRepository(PasteMeEntry) private readonly entriesRepo: Repository<PasteMeEntry>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {
    fs.mkdirSync(this.filesDir, { recursive: true })
  }

  private cleanText(value: any) {
    return String(value || '').slice(0, 2000)
  }

  parseVisibility(value: any): 'public' | 'private' {
    const visibility = String(value || '').trim().toLowerCase()
    return visibility === 'private' ? 'private' : 'public'
  }

  private extOf(fileName: string) {
    return path.extname(String(fileName || ''))
  }

  private toEntryDto(row: PasteMeEntry) {
    return {
      id: row.id,
      visibility: row.visibility,
      ownerUserId: row.ownerUserId,
      ownerUsername: row.ownerUsername,
      text: row.textContent,
      fileOriginalName: row.fileOriginalName,
      fileMime: row.fileMime,
      fileSizeBytes: row.fileSizeBytes ? Number(row.fileSizeBytes) : null,
      fileExpiresAt: row.fileExpiresAt,
      textExpiresAt: row.textExpiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      previewUrl: row.fileStoredName ? `/pasteme/file/${encodeURIComponent(row.id)}/preview` : null,
      downloadUrl: row.fileStoredName ? `/pasteme/file/${encodeURIComponent(row.id)}/download` : null,
    }
  }

  private async resolveOwner(userId: string | null) {
    if (!userId) return { ownerUserId: null, ownerUsername: null }
    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user) throw new BadRequestException('User not found')
    return { ownerUserId: user.id, ownerUsername: user.username }
  }

  async purgeExpiredData() {
    const now = new Date()

    const rowsWithFiles = await this.entriesRepo
      .createQueryBuilder('entry')
      .where('entry.fileStoredName IS NOT NULL')
      .andWhere('entry.fileExpiresAt IS NOT NULL')
      .andWhere('entry.fileExpiresAt <= :now', { now: now.toISOString() })
      .getMany()

    for (const row of rowsWithFiles) {
      if (row.fileStoredName) {
        const filePath = path.join(this.filesDir, row.fileStoredName)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      }
      row.fileStoredName = null
      row.fileOriginalName = null
      row.fileMime = null
      row.fileSizeBytes = null
      row.fileExpiresAt = null
      await this.entriesRepo.save(row)
    }

    const expiredRows = await this.entriesRepo
      .createQueryBuilder()
      .delete()
      .from(PasteMeEntry)
      .where('textExpiresAt <= :now', { now: now.toISOString() })
      .execute()

    return expiredRows.affected || 0
  }

  async createEntry(input: { visibility: 'public' | 'private'; text: any; file?: Express.Multer.File | null; ownerUserId: string | null }) {
    await this.purgeExpiredData()

    if (input.visibility === 'private' && !input.ownerUserId) {
      throw new BadRequestException('Private entries require authenticated user')
    }

    const text = this.cleanText(input.text)
    const hasText = text.trim().length > 0
    const hasFile = !!input.file

    if (!hasText && !hasFile) {
      throw new BadRequestException('Either text or file is required')
    }

    const owner = await this.resolveOwner(input.ownerUserId)
    const now = Date.now()
    const textExpiresAt = new Date(now + TEXT_TTL_MS)

    let fileStoredName: string | null = null
    let fileOriginalName: string | null = null
    let fileMime: string | null = null
    let fileSizeBytes: string | null = null
    let fileExpiresAt: Date | null = null

    if (input.file) {
      const ext = this.extOf(input.file.originalname)
      fileStoredName = `${randomUUID()}${ext}`
      const fullPath = path.join(this.filesDir, fileStoredName)
      fs.writeFileSync(fullPath, input.file.buffer)
      fileOriginalName = input.file.originalname
      fileMime = input.file.mimetype || 'application/octet-stream'
      fileSizeBytes = String(input.file.size || 0)
      fileExpiresAt = new Date(now + FILE_TTL_MS)
    }

    const row = this.entriesRepo.create({
      visibility: input.visibility,
      ownerUserId: owner.ownerUserId,
      ownerUsername: owner.ownerUsername,
      textContent: text,
      fileStoredName,
      fileOriginalName,
      fileMime,
      fileSizeBytes,
      fileExpiresAt,
      textExpiresAt,
    })

    const saved = await this.entriesRepo.save(row)
    return this.toEntryDto(saved)
  }

  async getLatest(visibility: 'public' | 'private', ownerUserId: string | null) {
    await this.purgeExpiredData()

    if (visibility === 'private' && !ownerUserId) {
      throw new BadRequestException('Private entries require authenticated user')
    }

    const qbBase = this.entriesRepo
      .createQueryBuilder('entry')
      .where('entry.visibility = :visibility', { visibility })

    if (visibility === 'private') {
      qbBase.andWhere('entry.ownerUserId = :ownerUserId', { ownerUserId })
    }

    const latestText = await qbBase
      .clone()
      .andWhere("COALESCE(entry.textContent, '') <> ''")
      .orderBy('entry.createdAt', 'DESC')
      .getOne()

    const latestFile = await qbBase
      .clone()
      .andWhere('entry.fileStoredName IS NOT NULL')
      .orderBy('entry.createdAt', 'DESC')
      .getOne()

    return {
      visibility,
      latestText: latestText ? this.toEntryDto(latestText) : null,
      latestFile: latestFile ? this.toEntryDto(latestFile) : null,
      textTtlMinutes: 120,
      fileTtlMinutes: 20,
    }
  }

  async getHistory(visibility: 'public' | 'private', ownerUserId: string | null, limit = 50) {
    await this.purgeExpiredData()

    if (visibility === 'private' && !ownerUserId) {
      throw new BadRequestException('Private entries require authenticated user')
    }

    const safeLimit = Math.max(1, Math.min(200, Number(limit || 50)))

    const qb = this.entriesRepo
      .createQueryBuilder('entry')
      .where('entry.visibility = :visibility', { visibility })
      .orderBy('entry.createdAt', 'DESC')
      .take(safeLimit)

    if (visibility === 'private') {
      qb.andWhere('entry.ownerUserId = :ownerUserId', { ownerUserId })
    }

    const rows = await qb.getMany()
    return rows.map(r => this.toEntryDto(r))
  }

  async getFileInfo(entryId: string, mode: 'preview' | 'download', ownerUserId: string | null) {
    await this.purgeExpiredData()

    const row = await this.entriesRepo.findOne({ where: { id: entryId } })
    if (!row) throw new NotFoundException('Entry not found')
    if (!row.fileStoredName) throw new NotFoundException('File not found')

    if (row.visibility === 'private') {
      if (!ownerUserId || ownerUserId !== row.ownerUserId) {
        throw new BadRequestException('Private file access denied')
      }
    }

    const filePath = path.join(this.filesDir, row.fileStoredName)
    if (!fs.existsSync(filePath)) throw new NotFoundException('File not found')

    return {
      filePath,
      mime: row.fileMime || 'application/octet-stream',
      originalName: row.fileOriginalName || 'file',
      mode,
    }
  }
}
