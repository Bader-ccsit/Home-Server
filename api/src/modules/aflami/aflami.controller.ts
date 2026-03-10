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
import { AflamiService } from './aflami.service'

@Controller('aflami')
export class AflamiController {
  constructor(private readonly service: AflamiService) {}

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

  @Get('movies')
  async movies(@Query('q') q?: string) {
    return await this.service.listMovies(q || '')
  }

  @Get('movie/:id')
  async movie(@Param('id') id: string) {
    return await this.service.getMovie(id)
  }

  @Post('movie')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'movie', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
  )
  async createMovie(@Req() req: any, @Body() body: any, @UploadedFiles() files: any) {
    const userId = this.extractAuthenticatedUserId(req)
    const uploader = await this.service.resolveUploader(userId)
    const movieFile = files?.movie?.[0] as Express.Multer.File | undefined
    const thumbnailFile = files?.thumbnail?.[0] as Express.Multer.File | undefined

    return await this.service.createMovie({
      uploaderUserId: uploader.uploaderUserId,
      uploaderUsername: uploader.uploaderUsername,
      title: String(body?.title || ''),
      description: String(body?.description || ''),
      categories: this.service.parseCategoriesFromBody(body?.categories),
      hasArabicTranslation: this.service.parseHasArabicTranslation(body?.hasArabicTranslation),
      movieFile,
      thumbnailFile: thumbnailFile || null,
    })
  }

  @Patch('movie/:id')
  async updateMovie(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.extractAuthenticatedUserId(req)
    return await this.service.updateMovie(id, {
      title: String(body?.title || ''),
      description: String(body?.description || ''),
      categories: this.service.parseCategoriesFromBody(body?.categories),
      hasArabicTranslation: this.service.parseHasArabicTranslation(body?.hasArabicTranslation),
    })
  }

  @Delete('movie/:id')
  async deleteMovie(@Req() req: any, @Param('id') id: string) {
    this.extractAuthenticatedUserId(req)
    return await this.service.deleteMovie(id)
  }

  @Get('movie-file/:id')
  async movieFile(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const info = await this.service.getMovieFilePath(id)
    const stat = fs.statSync(info.filePath)
    const fileSize = stat.size
    const rangeHeader = String(req?.headers?.range || '')

    res.setHeader('Content-Type', info.mime || 'video/mp4')
    res.setHeader('Content-Disposition', `inline; filename="${info.originalName || 'movie'}"`)
    res.setHeader('Accept-Ranges', 'bytes')

    if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
      res.setHeader('Content-Length', String(fileSize))
      fs.createReadStream(info.filePath).pipe(res)
      return
    }

    const parts = rangeHeader.replace(/bytes=/, '').split('-')
    const start = Number(parts[0])
    const end = parts[1] ? Number(parts[1]) : fileSize - 1

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= fileSize) {
      res.status(416)
      res.setHeader('Content-Range', `bytes */${fileSize}`)
      res.end()
      return
    }

    const chunkSize = end - start + 1
    res.status(206)
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`)
    res.setHeader('Content-Length', String(chunkSize))
    fs.createReadStream(info.filePath, { start, end }).pipe(res)
  }

  @Get('thumbnail/:id')
  async thumbnail(@Param('id') id: string, @Res() res: Response) {
    const info = await this.service.getThumbnailFilePath(id)
    res.setHeader('Content-Type', info.mime || 'image/jpeg')
    res.setHeader('Content-Disposition', 'inline')
    fs.createReadStream(info.filePath).pipe(res)
  }
}
