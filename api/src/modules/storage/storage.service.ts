import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StorageUsage } from '../../entities/storage.entity'
import { User } from '../../entities/user.entity'
import { uploadObject, listObjects } from '../../services/minioService'
import * as fs from 'fs'

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(StorageUsage) private usageRepo: Repository<StorageUsage>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  async list(userId: string) {
    return await listObjects(userId)
  }

  async upload(userId: string, filename: string, streamOrBuffer: any, size?: number) {
    // check quota
    const quota = Number(process.env.USER_STORAGE_QUOTA_BYTES || 21474836480)
    let usage = await this.usageRepo.findOne({ where: { user: { id: userId } }, relations: ['user'] })
    if (!usage) {
      const user = await this.usersRepo.findOne({ where: { id: userId } })
      usage = this.usageRepo.create({ user: user!, usedBytes: '0' })
    }
    const used = Number(usage.usedBytes || '0')
    if (used + (size || 0) > quota) throw new Error('Storage quota exceeded')

    const res = await uploadObject(userId, filename, streamOrBuffer, size)

    usage.usedBytes = String(used + (size || 0))
    await this.usageRepo.save(usage)
    return res
  }
}
