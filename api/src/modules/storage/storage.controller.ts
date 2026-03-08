import { BadRequestException, Controller, Delete, ForbiddenException, Get, Body, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { StorageService } from './storage.service'
import { Response } from 'express'
import { downloadObject } from '../../services/minioService'
import { ensureUserDir } from '../../services/minioService'
import { uploadObject, listObjects } from '../../services/minioService'
import * as jwt from 'jsonwebtoken'
import * as mime from 'mime'
import * as path from 'path'

function guessMimeType(filePath: string): string {
  const m: any = mime as any
  const fromDirect = typeof m?.getType === 'function' ? m.getType(filePath) : null
  const fromDefault = typeof m?.default?.getType === 'function' ? m.default.getType(filePath) : null
  if (fromDirect || fromDefault) return fromDirect || fromDefault

  const ext = path.extname(filePath || '').toLowerCase()
  const fallback: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  }
  return fallback[ext] || 'application/octet-stream'
}

@Controller('storage')
export class StorageController {
  constructor(private storage: StorageService) {
    // ensure shared folder exists (fire-and-forget)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ensureUserDir('shared').catch(() => null)
  }

  private extractAuthenticatedUserId(req: any): string | null {
    const reqUserSub = req?.user?.sub
    if (reqUserSub) return String(reqUserSub)

    const authHeader = (req?.headers?.authorization || req?.headers?.Authorization) as string | undefined
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
        if (payload?.sub) return String(payload.sub)
      } catch {
        // ignore and continue fallback resolution
      }
    }

    return null
  }

  private extractUserId(req: any): string | null {
    const authUser = this.extractAuthenticatedUserId(req)
    if (authUser) return authUser

    const headerUser = req?.headers?.['x-user-id'] || req?.headers?.['x-username']
    if (headerUser) return String(headerUser)

    return null
  }

  private parseQueryPath(rawPath?: string): string {
    const raw = String(rawPath || '')
    const plusFixed = raw.replace(/\+/g, ' ')
    try {
      return decodeURIComponent(plusFixed)
    } catch {
      return plusFixed
    }
  }

  // Development helpers: allow direct username-based access without DB (useful when frontend sends username)
  @Post('dev/upload')
  @UseInterceptors(FileInterceptor('file'))
  async devUpload(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Query('path') path?: string) {
    try {
      const username = req.headers['x-username'] || req.query.username
      if (!username) throw new Error('Missing x-username header')
      await ensureUserDir(String(username))
      const objectPath = path ? `${path.replace(/^\/+|\/+$/g, '')}/${file.originalname}` : file.originalname
      const res = await uploadObject(String(username), objectPath, file.buffer, file.size)
      return res
    } catch (err) {
      console.error('[storage.devUpload] ERROR', err && (err.stack || err.message || err))
      throw err
    }
  }

  @Get('dev/list')
  async devList(@Req() req: any, @Query('path') path?: string) {
    try {
      const username = req.headers['x-username'] || req.query.username
      if (!username) throw new Error('Missing x-username header')
      return await listObjects(String(username), path || '')
    } catch (err) {
      console.error('[storage.devList] ERROR', err && (err.stack || err.message || err))
      throw err
    }
  }

  // upload single file, optional query param path (folder)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Query('path') path?: string) {
    try {
      console.log('[storage.upload] headers=', req.headers)
      console.log('[storage.upload] file=', file && { originalname: file.originalname, size: file.size })
      const effective = this.extractUserId(req)
      if (!effective) throw new BadRequestException('Missing user id')
      if (!file) throw new BadRequestException('Missing file')
      const res = await this.storage.upload(String(effective), path || '', file.originalname, file.buffer, file.size)
      return res
    } catch (err) {
      console.error('[storage.upload] ERROR', err && (err.stack || err.message || err))
      throw err
    }
  }

  @Get('list')
  async list(@Req() req: any, @Query('path') path?: string) {
    try {
      console.log('[storage.list] headers=', req.headers)
      const effective = this.extractUserId(req)
      if (!effective) throw new BadRequestException('Missing user id')
      const resolvedPath = this.parseQueryPath(path)
      return await this.storage.list(String(effective), resolvedPath)
    } catch (err) {
      console.error('[storage.list] ERROR', err && (err.stack || err.message || err))
      throw err
    }
  }

  @Post('mkdir')
  async mkdir(@Req() req: any, @Body() body: any) {
    const effective = this.extractUserId(req)
    if (!effective) throw new BadRequestException('Missing user id')
    return await this.storage.mkdir(String(effective), body.path)
  }

  @Post('rename')
  async rename(@Req() req: any, @Body() body: any) {
    const effective = this.extractUserId(req)
    if (!effective) throw new BadRequestException('Missing user id')
    return await this.storage.rename(String(effective), body.path, body.newPath)
  }

  @Delete('delete')
  async delete(@Req() req: any, @Body() body: any) {
    const effective = this.extractUserId(req)
    if (!effective) throw new BadRequestException('Missing user id')
    return await this.storage.delete(String(effective), body.path)
  }

  @Get('download')
  async download(@Req() req: any, @Query('path') path?: string, @Query('username') usernameQuery?: string, @Res() res?: Response) {
    // allow special username query for direct links; otherwise use auth header user
      // Determine effective requester: prefer authenticated user (req.user), otherwise header x-user-id, otherwise username query
      const authUser = this.extractAuthenticatedUserId(req)
      const headerUser = req.headers['x-user-id'] || req.headers['x-username']
      const effective = authUser || headerUser || usernameQuery
      if (!effective) throw new BadRequestException('Missing user id')
      // If request is authenticated but usernameQuery provided for a different user, forbid
      if (authUser && usernameQuery && String(usernameQuery) !== String(authUser)) {
        throw new ForbiddenException('Forbidden')
      }
      const resolvedPath = this.parseQueryPath(path)
      let stream: any
      if (usernameQuery && !authUser) {
        // unauthenticated direct username download
        stream = await downloadObject(String(usernameQuery), resolvedPath)
      } else {
        stream = await this.storage.downloadStream(String(effective), resolvedPath)
      }
      // set basic headers - let browser decide content type
      res.setHeader('Content-Disposition', `attachment; filename="${(resolvedPath.split('/').pop() || '')}"`)
      stream.pipe(res)
  }

  @Get('preview')
  async preview(@Req() req: any, @Query('path') path?: string, @Query('username') usernameQuery?: string, @Res() res?: Response) {
    const authUser = this.extractAuthenticatedUserId(req)
    const headerUser = req.headers['x-user-id'] || req.headers['x-username']
    const effective = authUser || headerUser || usernameQuery
    if (!effective) throw new BadRequestException('Missing user id')
    if (authUser && usernameQuery && String(usernameQuery) !== String(authUser)) {
      throw new ForbiddenException('Forbidden')
    }
    const resolvedPath = this.parseQueryPath(path)
    let stream: any
    if (usernameQuery && !authUser) {
      stream = await downloadObject(String(usernameQuery), resolvedPath)
    } else {
      stream = await this.storage.downloadStream(String(effective), resolvedPath)
    }
    // Try to set content-type from storage metadata, then fallback by file extension.
    try {
      const info = await this.storage.info(String(effective), resolvedPath)
      if (info && info.mime) res.setHeader('Content-Type', info.mime)
      else {
        const guessed = guessMimeType(resolvedPath || '')
        res.setHeader('Content-Type', guessed)
      }
    } catch (e) {
      const guessed = guessMimeType(resolvedPath || '')
      res.setHeader('Content-Type', guessed)
    }
    // inline
    res.setHeader('Content-Disposition', `inline; filename="${(resolvedPath.split('/').pop() || '')}"`)
    stream.pipe(res)
  }

  @Get('info')
  async info(@Req() req: any, @Query('path') path?: string) {
    const effective = this.extractUserId(req)
    if (!effective) throw new BadRequestException('Missing user id')
    const resolvedPath = this.parseQueryPath(path)
    return await this.storage.info(String(effective), resolvedPath)
  }

  @Get('search')
  async search(@Req() req: any, @Query('q') q?: string, @Query('path') path?: string) {
    const effective = this.extractUserId(req)
    if (!effective) throw new BadRequestException('Missing user id')
    const resolvedPath = this.parseQueryPath(path)
    return await this.storage.search(String(effective), q || '', resolvedPath)
  }
}
