import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../../entities/user.entity'
import { SecretCredential } from '../../entities/secret-credential.entity'
import { SecretsAccessOtp } from '../../entities/secrets-access-otp.entity'
import * as jwt from 'jsonwebtoken'
import * as nodemailer from 'nodemailer'
import * as crypto from 'crypto'

type SortMode = 'newest' | 'oldest' | 'importance_high' | 'importance_low'

@Injectable()
export class SecretsService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(SecretCredential) private readonly credentialRepo: Repository<SecretCredential>,
    @InjectRepository(SecretsAccessOtp) private readonly accessOtpRepo: Repository<SecretsAccessOtp>,
  ) {}

  private getEncryptionKey(): Buffer {
    const raw = process.env.SECRETS_DATA_KEY || process.env.JWT_SECRET || 'secret'
    return crypto.createHash('sha256').update(raw).digest()
  }

  private encrypt(value: string): string {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.getEncryptionKey(), iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
  }

  private decrypt(payload: string | null): string {
    if (!payload) return ''
    const parts = payload.split(':')
    if (parts.length !== 3) return ''
    const iv = Buffer.from(parts[0], 'base64')
    const tag = Buffer.from(parts[1], 'base64')
    const encrypted = Buffer.from(parts[2], 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.getEncryptionKey(), iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  }

  private async sendAccessOtpEmail(user: User, code: string) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: 'Your Secrets access code',
      text: `Your Secrets access code is ${code}. It is valid for ${process.env.SECRETS_OTP_TTL_SECONDS || 300} seconds.`,
    })
  }

  async requestAccessOtp(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)

    const resendBufferSeconds = Number(process.env.SECRETS_OTP_RESEND_BUFFER_SECONDS || 60)
    const last = await this.accessOtpRepo.findOne({ where: { user: { id: userId } }, relations: ['user'], order: { createdAt: 'DESC' } })
    if (last) {
      const elapsedMs = new Date().getTime() - last.createdAt.getTime()
      if (elapsedMs < resendBufferSeconds * 1000) {
        throw new HttpException('Please wait before resending OTP', HttpStatus.TOO_MANY_REQUESTS)
      }
    }

    const code = (Math.floor(100000 + Math.random() * 900000)).toString()
    const row = this.accessOtpRepo.create({ user, code })
    await this.accessOtpRepo.save(row)
    await this.sendAccessOtpEmail(user, code)

    return { ok: true }
  }

  async verifyAccessOtp(userId: string, code: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)

    const otp = await this.accessOtpRepo.findOne({
      where: { user: { id: userId }, code: String(code || '') },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    })

    if (!otp) throw new BadRequestException('Invalid OTP')

    const ttl = Number(process.env.SECRETS_OTP_TTL_SECONDS || 300)
    const expiresAt = new Date(otp.createdAt.getTime() + ttl * 1000)
    if (expiresAt < new Date()) {
      throw new BadRequestException('OTP expired')
    }

    await this.accessOtpRepo.delete({ id: otp.id })

    const sessionSeconds = 20 * 60
    const token = jwt.sign(
      { sub: user.id, scope: 'secrets' },
      process.env.SECRETS_SESSION_SECRET || process.env.JWT_SECRET || 'secret',
      { expiresIn: sessionSeconds },
    )

    return { token, expiresInSeconds: sessionSeconds }
  }

  verifySecretsSession(userId: string, secretsToken: string) {
    if (!secretsToken) throw new UnauthorizedException('Missing secrets session token')
    try {
      const payload = jwt.verify(secretsToken, process.env.SECRETS_SESSION_SECRET || process.env.JWT_SECRET || 'secret') as any
      if (!payload || payload.scope !== 'secrets' || String(payload.sub) !== String(userId)) {
        throw new UnauthorizedException('Invalid secrets session token')
      }
    } catch {
      throw new UnauthorizedException('Invalid secrets session token')
    }
  }

  private mapListItem(item: SecretCredential) {
    return {
      id: item.id,
      credentialName: item.credentialName,
      importance: item.importance,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }

  async listCredentials(userId: string, query: string, sort: SortMode) {
    const qb = this.credentialRepo
      .createQueryBuilder('c')
      .where('c.user_id = :userId', { userId })

    if (query && query.trim()) {
      qb.andWhere('LOWER(c.credential_name) LIKE :q', { q: `%${query.trim().toLowerCase()}%` })
    }

    if (sort === 'oldest') {
      qb.orderBy('c.created_at', 'ASC')
    } else if (sort === 'importance_high') {
      qb.orderBy("CASE WHEN c.importance = 'high' THEN 0 ELSE 1 END", 'ASC').addOrderBy('c.created_at', 'DESC')
    } else if (sort === 'importance_low') {
      qb.orderBy("CASE WHEN c.importance = 'low' THEN 0 ELSE 1 END", 'ASC').addOrderBy('c.created_at', 'DESC')
    } else {
      qb.orderBy('c.created_at', 'DESC')
    }

    const rows = await qb.getMany()
    return rows.map(r => this.mapListItem(r))
  }

  private validateBody(body: any, allowPartial: boolean) {
    const credentialName = String(body?.credentialName || '').trim()
    const username = String(body?.username || '')
    const password = String(body?.password || '')
    const details = String(body?.details || '').trim()
    const importanceRaw = String(body?.importance || 'low').toLowerCase()
    const importance: 'high' | 'low' = importanceRaw === 'high' ? 'high' : 'low'

    if (!allowPartial || body?.credentialName !== undefined) {
      if (!credentialName) throw new BadRequestException('Credential name is required')
    }
    if (!allowPartial || body?.username !== undefined) {
      if (!username) throw new BadRequestException('Username is required')
    }
    if (!allowPartial || body?.password !== undefined) {
      if (!password) throw new BadRequestException('Password is required')
    }
    if (details.length > 1500) throw new BadRequestException('Details must be 1500 characters or less')

    return { credentialName, username, password, details, importance }
  }

  async createCredential(userId: string, body: any) {
    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)

    const payload = this.validateBody(body, false)

    const row = this.credentialRepo.create({
      user,
      credentialName: payload.credentialName,
      usernameEncrypted: this.encrypt(payload.username),
      passwordEncrypted: this.encrypt(payload.password),
      detailsEncrypted: payload.details ? this.encrypt(payload.details) : null,
      importance: payload.importance,
    })

    const saved = await this.credentialRepo.save(row)
    return this.mapListItem(saved)
  }

  async getCredential(userId: string, id: string) {
    const row = await this.credentialRepo.findOne({ where: { id, user: { id: userId } }, relations: ['user'] })
    if (!row) throw new HttpException('Credential not found', HttpStatus.NOT_FOUND)

    return {
      id: row.id,
      credentialName: row.credentialName,
      username: this.decrypt(row.usernameEncrypted),
      password: this.decrypt(row.passwordEncrypted),
      details: this.decrypt(row.detailsEncrypted),
      importance: row.importance,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async updateCredential(userId: string, id: string, body: any) {
    const row = await this.credentialRepo.findOne({ where: { id, user: { id: userId } }, relations: ['user'] })
    if (!row) throw new HttpException('Credential not found', HttpStatus.NOT_FOUND)

    const payload = this.validateBody(body, true)

    if (body?.credentialName !== undefined) row.credentialName = payload.credentialName
    if (body?.username !== undefined) row.usernameEncrypted = this.encrypt(payload.username)
    if (body?.password !== undefined) row.passwordEncrypted = this.encrypt(payload.password)
    if (body?.details !== undefined) row.detailsEncrypted = payload.details ? this.encrypt(payload.details) : null
    if (body?.importance !== undefined) row.importance = payload.importance

    const saved = await this.credentialRepo.save(row)
    return this.mapListItem(saved)
  }

  async deleteCredential(userId: string, id: string) {
    const row = await this.credentialRepo.findOne({ where: { id, user: { id: userId } }, relations: ['user'] })
    if (!row) throw new HttpException('Credential not found', HttpStatus.NOT_FOUND)
    await this.credentialRepo.delete({ id: row.id })
    return { ok: true }
  }
}
