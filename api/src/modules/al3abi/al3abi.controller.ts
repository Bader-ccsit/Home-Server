import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import * as jwt from 'jsonwebtoken'
import { Response } from 'express'
import * as fs from 'fs'
import { Al3abiService } from './al3abi.service'

@Controller('al3abi')
export class Al3abiController {
  constructor(private readonly service: Al3abiService) {}

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

  @Get('categories')
  categories() {
    return this.service.categories()
  }

  @Get('consoles')
  consoles() {
    return this.service.consoles()
  }

  @Get('games')
  async games(@Query('mode') mode?: string, @Query('q') q?: string, @Query('consoleKey') consoleKey?: string) {
    return await this.service.listGames({ mode, query: q, consoleKey })
  }

  @Get('game/:id')
  async game(@Param('id') id: string) {
    return await this.service.getGame(id)
  }

  @Get('manage/games')
  async manageGames(@Req() req: any, @Query('mode') mode?: string, @Query('q') q?: string) {
    this.extractAuthenticatedUserId(req)
    return await this.service.listGames({ mode, query: q })
  }

  @Post('manage/game')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'rom', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ]),
  )
  async createGame(@Req() req: any, @Body() body: any, @UploadedFiles() files: any) {
    const userId = this.extractAuthenticatedUserId(req)
    const uploader = await this.service.resolveUploader(userId)
    const romFile = files?.rom?.[0] as Express.Multer.File | undefined
    const coverFile = files?.cover?.[0] as Express.Multer.File | undefined

    return await this.service.createGame({
      uploaderUserId: uploader.uploaderUserId,
      uploaderUsername: uploader.uploaderUsername,
      title: String(body?.title || ''),
      description: String(body?.description || ''),
      categories: this.service.parseCategoriesFromBody(body?.categories),
      mode: this.service.parseMode(body?.mode),
      consoleKey: this.service.parseConsoleKey(body?.consoleKey),
      romFile: romFile as Express.Multer.File,
      coverFile: coverFile || null,
    })
  }

  @Patch('manage/game/:id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'rom', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ]),
  )
  async updateGame(@Req() req: any, @Param('id') id: string, @Body() body: any, @UploadedFiles() files: any) {
    this.extractAuthenticatedUserId(req)
    const romFile = files?.rom?.[0] as Express.Multer.File | undefined
    const coverFile = files?.cover?.[0] as Express.Multer.File | undefined

    return await this.service.updateGame(id, {
      title: String(body?.title || ''),
      description: String(body?.description || ''),
      categories: this.service.parseCategoriesFromBody(body?.categories),
      mode: this.service.parseMode(body?.mode),
      consoleKey: this.service.parseConsoleKey(body?.consoleKey),
      romFile: romFile || null,
      coverFile: coverFile || null,
    })
  }

  @Delete('manage/game/:id')
  async deleteGame(@Req() req: any, @Param('id') id: string) {
    this.extractAuthenticatedUserId(req)
    return await this.service.deleteGame(id)
  }

  @Get('rom/:id')
  async rom(@Param('id') id: string, @Res() res: Response) {
    const info = await this.service.getRomPath(id)
    res.setHeader('Content-Type', info.mime || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${info.originalName || 'game.rom'}"`)
    fs.createReadStream(info.filePath).pipe(res)
  }

  @Get('cover/:id')
  async cover(@Param('id') id: string, @Res() res: Response) {
    const info = await this.service.getCoverPath(id)
    res.setHeader('Content-Type', info.mime || 'image/jpeg')
    res.setHeader('Content-Disposition', 'inline')
    fs.createReadStream(info.filePath).pipe(res)
  }
}
