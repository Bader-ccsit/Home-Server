import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import * as fs from 'fs'
import * as jwt from 'jsonwebtoken'
import { PasteMeService } from './pasteme.service'

@Controller('pasteme')
export class PasteMeController {
  constructor(private readonly service: PasteMeService) {}

  private extractAuthenticatedUserId(req: any, required = false): string | null {
    const reqUserSub = req?.user?.sub
    if (reqUserSub) return String(reqUserSub)

    const authHeader = (req?.headers?.authorization || req?.headers?.Authorization) as string | undefined
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (required) throw new BadRequestException('Missing bearer token')
      return null
    }

    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
      if (!payload?.sub) throw new BadRequestException('Invalid token payload')
      return String(payload.sub)
    } catch {
      if (required) throw new BadRequestException('Invalid token')
      return null
    }
  }

  @Post('entry')
  @UseInterceptors(FileInterceptor('file'))
  async createEntry(@Req() req: any, @Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    const visibility = this.service.parseVisibility(body?.visibility)
    const userId = this.extractAuthenticatedUserId(req, visibility === 'private')

    return await this.service.createEntry({
      visibility,
      text: body?.text,
      file: file || null,
      ownerUserId: userId,
    })
  }

  @Get('latest')
  async latest(@Req() req: any, @Query('visibility') visibilityRaw?: string) {
    const visibility = this.service.parseVisibility(visibilityRaw)
    const userId = this.extractAuthenticatedUserId(req, visibility === 'private')
    return await this.service.getLatest(visibility, userId)
  }

  @Get('history')
  async history(@Req() req: any, @Query('visibility') visibilityRaw?: string, @Query('limit') limit?: string) {
    const visibility = this.service.parseVisibility(visibilityRaw)
    const userId = this.extractAuthenticatedUserId(req, visibility === 'private')
    return await this.service.getHistory(visibility, userId, Number(limit || 50))
  }

  @Get('file/:id/preview')
  async previewFile(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const userId = this.extractAuthenticatedUserId(req, false)
    const info = await this.service.getFileInfo(id, 'preview', userId)
    res.setHeader('Content-Type', info.mime)
    res.setHeader('Content-Disposition', `inline; filename="${info.originalName}"`)
    fs.createReadStream(info.filePath).pipe(res)
  }

  @Get('file/:id/download')
  async downloadFile(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const userId = this.extractAuthenticatedUserId(req, false)
    const info = await this.service.getFileInfo(id, 'download', userId)
    res.setHeader('Content-Type', info.mime)
    res.setHeader('Content-Disposition', `attachment; filename="${info.originalName}"`)
    fs.createReadStream(info.filePath).pipe(res)
  }
}
