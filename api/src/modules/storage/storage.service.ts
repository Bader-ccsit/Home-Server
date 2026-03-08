import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StorageUsage } from '../../entities/storage.entity'
import { User } from '../../entities/user.entity'
import { uploadObject, listObjects, ensureUserDir, mkdir, deleteObject, renameObject, downloadObject, statObject, searchObjects } from '../../services/minioService'
import * as fs from 'fs'

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(StorageUsage) private usageRepo: Repository<StorageUsage>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  // helper: accept either database id or username
  private async resolveUser(identifier: string) {
    console.log('[storage.service] resolveUser identifier=', identifier)
    if (!identifier) return null
    try {
      // if identifier looks like a UUID, query by id; otherwise treat as username
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      let user = null
      if (uuidRegex.test(identifier)) {
        user = await this.usersRepo.findOne({ where: { id: identifier } })
      }
      if (!user) {
        user = await this.usersRepo.findOne({ where: { username: identifier } })
      }
      console.log('[storage.service] resolved user=', user && { id: user.id, username: user.username })
      return user
    } catch (err) {
      console.error('[storage.service] resolveUser ERROR', err && (err.stack || err.message || err))
      throw err
    }
  }

  async list(userId: string, folder = '') {
    const user = await this.resolveUser(userId)
    if (!user) throw new Error('User not found')
    return await listObjects(user.username, folder)
  }

  async upload(userId: string, targetPath: string, filename: string, streamOrBuffer: any, size?: number) {
    // resolve user first (identifier may be username or id)
    const user = await this.resolveUser(userId)
    if (!user) throw new Error('User not found')

    // check quota
    const quota = Number(process.env.USER_STORAGE_QUOTA_BYTES || 21474836480)
    let usage = await this.usageRepo.findOne({ where: { user: { id: user.id } }, relations: ['user'] })
    if (!usage) {
      usage = this.usageRepo.create({ user: user!, usedBytes: '0' })
    }
    const used = Number(usage.usedBytes || '0')
    if (used + (size || 0) > quota) throw new Error('Storage quota exceeded')

    const objectPath = targetPath ? `${targetPath.replace(/^\/+|\/+$/g, '')}/${filename}` : filename
    const res = await uploadObject(user.username, objectPath, streamOrBuffer, size)

    usage.usedBytes = String(used + (size || 0))
    await this.usageRepo.save(usage)
    return res
  }

  async mkdir(userId: string, folderPath: string) {
    const user = await this.resolveUser(userId)
    if (!user) throw new Error('User not found')
    return await mkdir(user.username, folderPath)
  }

  async delete(userId: string, objectPath: string) {
    const user = await this.resolveUser(userId)
    if (!user) throw new Error('User not found')
    return await deleteObject(user.username, objectPath)
  }

  async rename(userId: string, objectPath: string, newPath: string) {
    const user = await this.resolveUser(userId)
    if (!user) throw new Error('User not found')
    return await renameObject(user.username, objectPath, newPath)
  }

  async downloadStream(userId: string, objectPath: string) {
    const user = await this.resolveUser(userId)
    if (!user) throw new Error('User not found')
    return await downloadObject(user.username, objectPath)
  }

  async info(userId: string, objectPath: string) {
    const user = await this.resolveUser(userId)
    if (!user) throw new Error('User not found')
    return await statObject(user.username, objectPath)
  }

  async search(userId: string, q: string, folder = '') {
    const user = await this.resolveUser(userId)
    if (!user) throw new Error('User not found')
    // search currently ignores folder param in minioService; prefixing may be added later
    return await searchObjects(user.username, q)
  }
}
