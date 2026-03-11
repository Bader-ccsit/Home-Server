import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException } from '@nestjs/common'
import { AdminService } from './admin.service'

@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  private extractAdminToken(req: any) {
    const authHeader = (req?.headers?.authorization || req?.headers?.Authorization) as string | undefined
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing admin token')
    }
    return authHeader.slice(7)
  }

  private assertAdmin(req: any) {
    const token = this.extractAdminToken(req)
    return this.service.verifyAdminToken(token)
  }

  @Post('auth/signin')
  async signIn(@Body() body: any) {
    return this.service.signIn(String(body?.username || ''), String(body?.password || ''))
  }

  @Get('overview')
  async overview(@Req() req: any) {
    this.assertAdmin(req)
    return await this.service.overview()
  }

  @Patch('users/:id/username')
  async changeUsername(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req)
    return await this.service.changeUsername(id, String(body?.username || ''))
  }

  @Patch('users/:id/email')
  async changeEmail(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req)
    return await this.service.changeEmail(id, String(body?.email || ''))
  }

  @Patch('users/:id/password')
  async changePassword(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req)
    return await this.service.changePassword(id, String(body?.password || ''))
  }

  @Delete('users/:id')
  async deleteUser(@Req() req: any, @Param('id') id: string) {
    this.assertAdmin(req)
    return await this.service.deleteUser(id)
  }
}
