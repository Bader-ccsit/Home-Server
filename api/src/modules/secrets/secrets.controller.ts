import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common'
import * as jwt from 'jsonwebtoken'
import { SecretsService } from './secrets.service'

@Controller('secrets')
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  private extractAuthenticatedUserId(req: any): string {
    const reqUserSub = req?.user?.sub
    if (reqUserSub) return String(reqUserSub)

    const authHeader = (req?.headers?.authorization || req?.headers?.Authorization) as string | undefined
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BadRequestException('Missing bearer token')
    }

    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
      if (!payload?.sub) throw new BadRequestException('Invalid token payload')
      return String(payload.sub)
    } catch {
      throw new BadRequestException('Invalid token')
    }
  }

  private extractSecretsToken(req: any): string {
    return String(req?.headers?.['x-secrets-token'] || '')
  }

  @Post('request-access-otp')
  async requestAccessOtp(@Req() req: any) {
    const userId = this.extractAuthenticatedUserId(req)
    return await this.secretsService.requestAccessOtp(userId)
  }

  @Post('verify-access-otp')
  async verifyAccessOtp(@Req() req: any, @Body() body: any) {
    const userId = this.extractAuthenticatedUserId(req)
    const otp = String(body?.otp || '').trim()
    if (!otp) throw new BadRequestException('OTP is required')
    return await this.secretsService.verifyAccessOtp(userId, otp)
  }

  @Get('credentials')
  async listCredentials(@Req() req: any, @Query('q') q?: string, @Query('sort') sort?: string) {
    const userId = this.extractAuthenticatedUserId(req)
    this.secretsService.verifySecretsSession(userId, this.extractSecretsToken(req))
    const sortMode = String(sort || 'newest') as any
    return await this.secretsService.listCredentials(userId, String(q || ''), sortMode)
  }

  @Post('credentials')
  async createCredential(@Req() req: any, @Body() body: any) {
    const userId = this.extractAuthenticatedUserId(req)
    this.secretsService.verifySecretsSession(userId, this.extractSecretsToken(req))
    return await this.secretsService.createCredential(userId, body)
  }

  @Get('credentials/:id')
  async getCredential(@Req() req: any, @Param('id') id: string) {
    const userId = this.extractAuthenticatedUserId(req)
    this.secretsService.verifySecretsSession(userId, this.extractSecretsToken(req))
    return await this.secretsService.getCredential(userId, id)
  }

  @Patch('credentials/:id')
  async updateCredential(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = this.extractAuthenticatedUserId(req)
    this.secretsService.verifySecretsSession(userId, this.extractSecretsToken(req))
    return await this.secretsService.updateCredential(userId, id, body)
  }

  @Delete('credentials/:id')
  async deleteCredential(@Req() req: any, @Param('id') id: string) {
    const userId = this.extractAuthenticatedUserId(req)
    this.secretsService.verifySecretsSession(userId, this.extractSecretsToken(req))
    return await this.secretsService.deleteCredential(userId, id)
  }
}
