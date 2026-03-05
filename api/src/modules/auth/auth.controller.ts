import { Controller, Post, Body } from '@nestjs/common'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('signup')
  async signup(@Body() body: any) {
    const { username, email, password } = body
    await this.auth.signup(username, email, password)
    return { ok: true }
  }

  @Post('request-password-reset')
  async requestReset(@Body() body: any) {
    const { identifier } = body
    return await this.auth.requestPasswordReset(identifier)
  }

  @Post('reset-password')
  async reset(@Body() body: any) {
    const { identifier, otp, newPassword } = body
    return await this.auth.resetPassword(identifier, otp, newPassword)
  }

  @Post('verify-otp')
  async verify(@Body() body: any) {
    const { email, otp } = body
    await this.auth.verifyOtp(email, otp)
    return { ok: true }
  }

  @Post('resend-otp')
  async resend(@Body() body: any) {
    await this.auth.resendOtp(body.email)
    return { ok: true }
  }

  @Post('signin')
  async signin(@Body() body: any) {
    const { identifier, password } = body
    // accept either identifier or email for legacy callers
    const id = identifier || body.email
    return await this.auth.signin(id, password)
  }
}
