import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from '../../entities/user.entity'
import { ensureUserDir } from '../../services/minioService'
import { Otp } from '../../entities/otp.entity'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'
import * as nodemailer from 'nodemailer'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Otp) private otpRepo: Repository<Otp>,
  ) {}

  private readonly logger = new Logger(AuthService.name)

  async signup(username: string, email: string, password: string) {
    // validate password
    if (!validatePassword(password)) {
      throw new HttpException('Password must be at least 6 characters and contain a number or special character', HttpStatus.BAD_REQUEST)
    }
    const existing = await this.usersRepo.findOne({ where: [{ email }, { username }] })
    if (existing) throw new HttpException('User already exists', HttpStatus.CONFLICT)
    const passwordHash = await bcrypt.hash(password, 10)
    const user = this.usersRepo.create({ username, email, passwordHash })
    await this.usersRepo.save(user)
    // create user's storage directory (local services/minio/<username>) so they have a drive immediately
    try {
      await ensureUserDir(username)
    } catch (err) {
      this.logger.warn('Failed to create user storage directory', (err as any).message)
    }
    try {
      await this.sendOtp(user)
    } catch (err) {
      // don't crash the whole process for email delivery issues; log and continue
      this.logger.error('Failed to send OTP email', err as any)
    }
    return user
  }

  async sendOtp(user: User, purpose: 'activation' | 'reset' = 'activation') {
    const code = (Math.floor(1000 + Math.random() * 9000)).toString()
    const otp = this.otpRepo.create({ code, user })
    await this.otpRepo.save(otp)

    // send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465, // true for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        // Allow self-signed certs locally; in production you should not disable this
        rejectUnauthorized: false,
      },
    })

    const subject = purpose === 'reset' ? 'Your My Home Server password reset code' : 'Your My Home Server activation code'
    const text = purpose === 'reset'
      ? `Your password reset code is ${code}. It is valid for ${process.env.OTP_TTL_SECONDS || 300} seconds.`
      : `Your activation code is ${code}. It is valid for ${process.env.OTP_TTL_SECONDS || 300} seconds.`
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: user.email,
        subject,
        text,
      })
    } catch (err) {
      // bubble up as an HttpException when called from an HTTP route? No — log and rethrow
      this.logger.error('SMTP sendMail failed', err as any)
      throw new HttpException('Failed to send OTP email', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async requestPasswordReset(identifier: string) {
    const user = await this.usersRepo.findOne({ where: [{ email: identifier }, { username: identifier }] })
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    // Reuse sendOtp but mark purpose reset
    await this.sendOtp(user, 'reset')
    return { ok: true }
  }

  async resetPassword(identifier: string, code: string, newPassword: string) {
    if (!validatePassword(newPassword)) {
      throw new HttpException('Password must be at least 6 characters and contain a number or special character', HttpStatus.BAD_REQUEST)
    }
    const user = await this.usersRepo.findOne({ where: [{ email: identifier }, { username: identifier }] })
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)

    const otp = await this.otpRepo.findOne({ where: { code }, relations: ['user'] })
    if (!otp || otp.user.id !== user.id) throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST)
    const ttl = Number(process.env.OTP_TTL_SECONDS || 300)
    const expiresAt = new Date(otp.createdAt.getTime() + ttl * 1000)
    if (expiresAt < new Date()) throw new HttpException('OTP expired', HttpStatus.BAD_REQUEST)

    // all good; update password
    const passwordHash = await bcrypt.hash(newPassword, 10)
    user.passwordHash = passwordHash
    await this.usersRepo.save(user)

    // consume OTP
    await this.otpRepo.delete({ id: otp.id })
    return { ok: true }
  }

  async verifyOtp(email: string, code: string) {
    const user = await this.usersRepo.findOne({ where: { email } })
  if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    const otp = await this.otpRepo.findOne({ where: { code }, relations: ['user'] })
  if (!otp || otp.user.id !== user.id) throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST)
    const ttl = Number(process.env.OTP_TTL_SECONDS || 300)
    const expiresAt = new Date(otp.createdAt.getTime() + ttl * 1000)
  if (expiresAt < new Date()) throw new HttpException('OTP expired', HttpStatus.BAD_REQUEST)
    user.activated = true
    await this.usersRepo.save(user)
    return user
  }

  async resendOtp(email: string) {
    const user = await this.usersRepo.findOne({ where: { email } })
  if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)

    // check last send buffer
    const last = await this.otpRepo.findOne({ where: { user }, order: { createdAt: 'DESC' } })
    if (last) {
      const buffer = Number(process.env.OTP_RESEND_BUFFER_SECONDS || 60)
      if (new Date().getTime() - last.createdAt.getTime() < buffer * 1000) {
  throw new HttpException('Please wait before resending OTP', HttpStatus.TOO_MANY_REQUESTS)
      }
    }
    await this.sendOtp(user)
  }

  async signin(identifier: string, password: string) {
    const user = await this.usersRepo.findOne({ where: [{ email: identifier }, { username: identifier }] })
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED)
    if (!user.activated) return { needsActivation: true, email: user.email }
    const token = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '365d' },
    )
    // return token and basic user info so clients can store username/id
    return { token, user: { id: user.id, username: user.username } }
  }
}

function validatePassword(p: string) {
  if (!p || p.length < 6) return false
  // contains at least one number or special character
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p)) return false
  return true
}
