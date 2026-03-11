import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as jwt from 'jsonwebtoken'
import * as bcrypt from 'bcrypt'
import { User } from '../../entities/user.entity'
import { StorageUsage } from '../../entities/storage.entity'
import { AflamiMovie } from '../../entities/aflami-movie.entity'
import { SecretCredential } from '../../entities/secret-credential.entity'
import { ShoppingCartItem } from '../../entities/shopping-cart-item.entity'
import { Al3abiGame } from '../../entities/al3abi-game.entity'
import { PasteMeEntry } from '../../entities/pasteme-entry.entity'
import { Otp } from '../../entities/otp.entity'

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(StorageUsage) private readonly storageRepo: Repository<StorageUsage>,
    @InjectRepository(AflamiMovie) private readonly aflamiRepo: Repository<AflamiMovie>,
    @InjectRepository(SecretCredential) private readonly secretsRepo: Repository<SecretCredential>,
    @InjectRepository(ShoppingCartItem) private readonly shoppingRepo: Repository<ShoppingCartItem>,
    @InjectRepository(Al3abiGame) private readonly al3abiRepo: Repository<Al3abiGame>,
    @InjectRepository(PasteMeEntry) private readonly pasteMeRepo: Repository<PasteMeEntry>,
    @InjectRepository(Otp) private readonly otpRepo: Repository<Otp>,
  ) {}

  private getAdminCreds() {
    return {
      username: process.env.ADMIN_USERNAME || 'Admin',
      password: process.env.ADMIN_PASSWORD || 'Admin@Bader',
    }
  }

  private adminJwtSecret() {
    return process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'secret'
  }

  signIn(username: string, password: string) {
    const creds = this.getAdminCreds()
    if (username !== creds.username || password !== creds.password) {
      throw new UnauthorizedException('Invalid admin credentials')
    }

    const token = jwt.sign(
      { role: 'admin', username: creds.username, scope: 'admin:full' },
      this.adminJwtSecret(),
      { expiresIn: '12h', subject: 'admin' },
    )

    return {
      token,
      admin: { username: creds.username },
      expiresInSeconds: 12 * 60 * 60,
    }
  }

  verifyAdminToken(token: string) {
    try {
      const payload = jwt.verify(token, this.adminJwtSecret()) as any
      if (!payload || payload.role !== 'admin') throw new UnauthorizedException('Invalid admin token')
      return payload
    } catch {
      throw new UnauthorizedException('Invalid admin token')
    }
  }

  async overview() {
    const [
      totalUsers,
      activatedUsers,
      totalAflamiMovies,
      totalSecretCredentials,
      totalShoppingItems,
      totalAl3abiGames,
      totalPasteMeEntries,
    ] = await Promise.all([
      this.usersRepo.count(),
      this.usersRepo.count({ where: { activated: true } }),
      this.aflamiRepo.count(),
      this.secretsRepo.count(),
      this.shoppingRepo.count(),
      this.al3abiRepo.count(),
      this.pasteMeRepo.count(),
    ])

    const usageRows = await this.storageRepo.find({ relations: ['user'] })
    const totalStorageUsedBytes = usageRows.reduce((sum, row) => sum + Number(row.usedBytes || 0), 0)

    const users = await this.usersRepo.find({ select: { id: true, username: true, email: true, activated: true }, take: 25, order: { username: 'ASC' } })

    return {
      serverTime: new Date().toISOString(),
      process: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryRssBytes: process.memoryUsage().rss,
      },
      metrics: {
        totalUsers,
        activatedUsers,
        totalStorageUsedBytes,
        totalAflamiMovies,
        totalSecretCredentials,
        totalShoppingItems,
        totalAl3abiGames,
        totalPasteMeEntries,
      },
      users,
    }
  }

  async changeUsername(userId: string, username: string) {
    const next = String(username || '').trim()
    if (!next) throw new BadRequestException('Username is required')

    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    const conflict = await this.usersRepo.findOne({ where: { username: next } })
    if (conflict && conflict.id !== user.id) {
      throw new BadRequestException('Username is already used')
    }

    user.username = next
    await this.usersRepo.save(user)
    return { ok: true, user: { id: user.id, username: user.username, email: user.email, activated: user.activated } }
  }

  async changeEmail(userId: string, email: string) {
    const next = String(email || '').trim().toLowerCase()
    if (!next || !/^\S+@\S+\.\S+$/.test(next)) {
      throw new BadRequestException('Valid email is required')
    }

    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    const conflict = await this.usersRepo.findOne({ where: { email: next } })
    if (conflict && conflict.id !== user.id) {
      throw new BadRequestException('Email is already used')
    }

    user.email = next
    await this.usersRepo.save(user)
    return { ok: true, user: { id: user.id, username: user.username, email: user.email, activated: user.activated } }
  }

  async changePassword(userId: string, password: string) {
    const next = String(password || '')
    if (!validatePassword(next)) {
      throw new BadRequestException('Password must be at least 6 characters and contain a number or special character')
    }

    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    user.passwordHash = await bcrypt.hash(next, 10)
    await this.usersRepo.save(user)
    return { ok: true }
  }

  async deleteUser(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    await this.otpRepo
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId', { userId })
      .execute()

    await this.storageRepo
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId', { userId })
      .execute()

    await this.usersRepo.delete({ id: userId })
    return { ok: true }
  }
}

function validatePassword(p: string) {
  if (!p || p.length < 6) return false
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p)) return false
  return true
}
