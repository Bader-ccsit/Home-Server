import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { Al3abiGame } from '../../entities/al3abi-game.entity'
import { User } from '../../entities/user.entity'

type CreateGameInput = {
  uploaderUserId: string
  uploaderUsername: string
  title: string
  description: string
  categories: string[]
  mode: 'retro' | 'family'
  consoleKey: string | null
  romFile: Express.Multer.File
  coverFile?: Express.Multer.File | null
}

type UpdateGameInput = {
  title: string
  description: string
  categories: string[]
  mode: 'retro' | 'family'
  consoleKey: string | null
  romFile?: Express.Multer.File | null
  coverFile?: Express.Multer.File | null
}

@Injectable()
export class Al3abiService {
  private readonly supportedCoverExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])
  private readonly supportedRomExtensions = new Set([
    '.nes', '.sfc', '.smc', '.n64', '.z64', '.v64', '.gba', '.gb', '.gbc', '.bin', '.cue', '.md', '.gen', '.sms', '.gg', '.zip', '.7z', '.nds', '.iso', '.chd', '.wad', '.rom', '.a26',
  ])

  private readonly categoriesList = [
    'Action',
    'Adventure',
    'Arcade',
    'Puzzle',
    'Racing',
    'Fighting',
    'Sports',
    'Platformer',
    'Strategy',
    'RPG',
    'Party',
    'Co-op',
    'Kids',
    'Educational',
  ]

  private readonly consolesList = [
    { key: 'nes', nameEn: 'Nintendo Entertainment System', nameAr: 'نينتندو إنترتينمنت سيستم', emulatorCore: 'nes' },
    { key: 'snes', nameEn: 'Super Nintendo (SNES)', nameAr: 'سوبر نينتندو', emulatorCore: 'snes' },
    { key: 'n64', nameEn: 'Nintendo 64', nameAr: 'نينتندو 64', emulatorCore: 'n64' },
    { key: 'gb', nameEn: 'Game Boy', nameAr: 'جيم بوي', emulatorCore: 'gb' },
    { key: 'gbc', nameEn: 'Game Boy Color', nameAr: 'جيم بوي كولر', emulatorCore: 'gb' },
    { key: 'gba', nameEn: 'Game Boy Advance', nameAr: 'جيم بوي أدفانس', emulatorCore: 'gba' },
    { key: 'segaMD', nameEn: 'Sega Mega Drive', nameAr: 'سيجا ميجا درايف', emulatorCore: 'segaMD' },
    { key: 'arcade', nameEn: 'Arcade', nameAr: 'أركيد', emulatorCore: 'arcade' },
    { key: 'psx', nameEn: 'PlayStation 1', nameAr: 'بلايستيشن 1', emulatorCore: 'psx' },
    { key: 'nds', nameEn: 'Nintendo DS', nameAr: 'نينتندو دي إس', emulatorCore: 'nds' },
  ]

  private readonly storageRoot = path.resolve(process.cwd(), 'services', 'al3abi')
  private readonly romsDir = path.join(this.storageRoot, 'roms')
  private readonly coversDir = path.join(this.storageRoot, 'covers')

  constructor(
    @InjectRepository(Al3abiGame) private readonly gamesRepo: Repository<Al3abiGame>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {
    fs.mkdirSync(this.romsDir, { recursive: true })
    fs.mkdirSync(this.coversDir, { recursive: true })
  }

  categories() {
    return this.categoriesList
  }

  consoles() {
    return this.consolesList
  }

  parseCategoriesFromBody(value: any) {
    if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean)
    const raw = String(value || '').trim()
    if (!raw) return []
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.map(v => String(v || '').trim()).filter(Boolean)
      } catch {
        return []
      }
    }
    return raw.split(',').map(v => v.trim()).filter(Boolean)
  }

  parseMode(value: any): 'retro' | 'family' {
    const mode = String(value || '').toLowerCase().trim()
    return mode === 'family' ? 'family' : 'retro'
  }

  parseConsoleKey(value: any) {
    const key = String(value || '').trim()
    return key || null
  }

  async resolveUploader(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user) throw new BadRequestException('User not found')
    return { uploaderUserId: user.id, uploaderUsername: user.username }
  }

  private sanitizeText(value: string, max: number) {
    return String(value || '').trim().slice(0, max)
  }

  private extOf(fileName: string) {
    return path.extname(String(fileName || '')).toLowerCase()
  }

  private validateRomFile(file: Express.Multer.File | null | undefined) {
    if (!file) throw new BadRequestException('Rom file is required')
    const ext = this.extOf(file.originalname)
    if (!this.supportedRomExtensions.has(ext)) {
      throw new BadRequestException(`Unsupported rom format: ${ext || 'unknown'}`)
    }
  }

  private validateCoverFile(file: Express.Multer.File | null | undefined) {
    if (!file) return
    const ext = this.extOf(file.originalname)
    const mime = String(file.mimetype || '').toLowerCase()
    if (!this.supportedCoverExtensions.has(ext) || !mime.startsWith('image/')) {
      throw new BadRequestException('Unsupported cover image format')
    }
  }

  private validateModeConsole(mode: 'retro' | 'family', consoleKey: string | null) {
    if (mode === 'retro') {
      if (!consoleKey) throw new BadRequestException('Retro game requires a console selection')
      const exists = this.consolesList.some(c => c.key === consoleKey)
      if (!exists) throw new BadRequestException('Invalid console selected')
      return
    }
  }

  private toGameDto(game: Al3abiGame) {
    const categories = game.categories ? game.categories.split('|').filter(Boolean) : []
    const consoleInfo = this.consolesList.find(c => c.key === game.consoleKey) || null
    return {
      id: game.id,
      title: game.title,
      description: game.description,
      categories,
      mode: game.mode,
      consoleKey: game.consoleKey,
      consoleNameEn: consoleInfo?.nameEn || null,
      consoleNameAr: consoleInfo?.nameAr || null,
      emulatorCore: consoleInfo?.emulatorCore || null,
      uploaderUsername: game.uploaderUsername,
      romUrl: `/al3abi/rom/${encodeURIComponent(game.id)}`,
      coverUrl: game.coverFileName ? `/al3abi/cover/${encodeURIComponent(game.id)}` : null,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    }
  }

  async listGames(filters: { mode?: string; query?: string; consoleKey?: string }) {
    const mode = String(filters.mode || '').trim().toLowerCase()
    const query = String(filters.query || '').trim().toLowerCase()
    const consoleKey = String(filters.consoleKey || '').trim()

    let rows = await this.gamesRepo.find({ order: { createdAt: 'DESC' } })
    if (mode === 'retro' || mode === 'family') rows = rows.filter(r => r.mode === mode)
    if (consoleKey) rows = rows.filter(r => String(r.consoleKey || '') === consoleKey)
    if (query) rows = rows.filter(r => String(r.title || '').toLowerCase().includes(query))

    return rows.map(r => this.toGameDto(r))
  }

  async getGame(id: string) {
    const row = await this.gamesRepo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('Game not found')
    return this.toGameDto(row)
  }

  async createGame(input: CreateGameInput) {
    this.validateRomFile(input.romFile)
    this.validateCoverFile(input.coverFile)
    this.validateModeConsole(input.mode, input.consoleKey)

    const title = this.sanitizeText(input.title, 255)
    const description = this.sanitizeText(input.description, 2000)
    const categories = input.categories.filter(Boolean)

    if (!title) throw new BadRequestException('Game name is required')
    if (categories.length === 0) throw new BadRequestException('At least one category is required')

    const romExt = this.extOf(input.romFile.originalname)
    const romStoredName = `${randomUUID()}${romExt}`
    const romPath = path.join(this.romsDir, romStoredName)
    fs.writeFileSync(romPath, input.romFile.buffer)

    let coverStoredName: string | null = null
    if (input.coverFile) {
      const coverExt = this.extOf(input.coverFile.originalname)
      coverStoredName = `${randomUUID()}${coverExt}`
      fs.writeFileSync(path.join(this.coversDir, coverStoredName), input.coverFile.buffer)
    }

    const row = this.gamesRepo.create({
      title,
      description,
      categories: categories.join('|'),
      mode: input.mode,
      consoleKey: input.mode === 'retro' ? input.consoleKey : null,
      uploaderUserId: input.uploaderUserId,
      uploaderUsername: input.uploaderUsername,
      romFileName: romStoredName,
      romOriginalName: input.romFile.originalname,
      romMime: input.romFile.mimetype || 'application/octet-stream',
      romSizeBytes: String(input.romFile.size || 0),
      coverFileName: coverStoredName,
      coverMime: input.coverFile?.mimetype || null,
    })

    const saved = await this.gamesRepo.save(row)
    return this.toGameDto(saved)
  }

  async updateGame(id: string, input: UpdateGameInput) {
    const row = await this.gamesRepo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('Game not found')

    if (input.romFile) this.validateRomFile(input.romFile)
    if (input.coverFile) this.validateCoverFile(input.coverFile)
    this.validateModeConsole(input.mode, input.consoleKey)

    const title = this.sanitizeText(input.title, 255)
    const description = this.sanitizeText(input.description, 2000)
    const categories = input.categories.filter(Boolean)

    if (!title) throw new BadRequestException('Game name is required')
    if (categories.length === 0) throw new BadRequestException('At least one category is required')

    if (input.romFile) {
      if (row.romFileName) {
        const oldRom = path.join(this.romsDir, row.romFileName)
        if (fs.existsSync(oldRom)) fs.unlinkSync(oldRom)
      }
      const romExt = this.extOf(input.romFile.originalname)
      const romStoredName = `${randomUUID()}${romExt}`
      fs.writeFileSync(path.join(this.romsDir, romStoredName), input.romFile.buffer)
      row.romFileName = romStoredName
      row.romOriginalName = input.romFile.originalname
      row.romMime = input.romFile.mimetype || 'application/octet-stream'
      row.romSizeBytes = String(input.romFile.size || 0)
    }

    if (input.coverFile) {
      if (row.coverFileName) {
        const oldCover = path.join(this.coversDir, row.coverFileName)
        if (fs.existsSync(oldCover)) fs.unlinkSync(oldCover)
      }
      const coverExt = this.extOf(input.coverFile.originalname)
      const coverStoredName = `${randomUUID()}${coverExt}`
      fs.writeFileSync(path.join(this.coversDir, coverStoredName), input.coverFile.buffer)
      row.coverFileName = coverStoredName
      row.coverMime = input.coverFile.mimetype || null
    }

    row.title = title
    row.description = description
    row.categories = categories.join('|')
    row.mode = input.mode
    row.consoleKey = input.mode === 'retro' ? input.consoleKey : null

    const updated = await this.gamesRepo.save(row)
    return this.toGameDto(updated)
  }

  async deleteGame(id: string) {
    const row = await this.gamesRepo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('Game not found')

    if (row.romFileName) {
      const romPath = path.join(this.romsDir, row.romFileName)
      if (fs.existsSync(romPath)) fs.unlinkSync(romPath)
    }
    if (row.coverFileName) {
      const coverPath = path.join(this.coversDir, row.coverFileName)
      if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath)
    }

    await this.gamesRepo.delete({ id })
    return { ok: true }
  }

  async getRomPath(id: string) {
    const row = await this.gamesRepo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('Game not found')
    const filePath = path.join(this.romsDir, row.romFileName)
    if (!fs.existsSync(filePath)) throw new NotFoundException('Rom file not found')
    return { filePath, mime: row.romMime, originalName: row.romOriginalName }
  }

  async getCoverPath(id: string) {
    const row = await this.gamesRepo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('Game not found')
    if (!row.coverFileName) throw new NotFoundException('Cover not found')
    const filePath = path.join(this.coversDir, row.coverFileName)
    if (!fs.existsSync(filePath)) throw new NotFoundException('Cover file not found')
    return { filePath, mime: row.coverMime || 'image/jpeg' }
  }
}
