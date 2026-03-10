import { BadRequestException, Body, Controller, Get, Post, Query, Res } from '@nestjs/common'
import { Response } from 'express'
import { HmlnyService } from './hmlny.service'
import { Readable } from 'stream'
import * as fs from 'fs'

@Controller('7mlny')
export class HmlnyController {
  constructor(private readonly service: HmlnyService) {}

  private buildUpstreamHeaders(media: { headers: Record<string, string>; pageUrl?: string }, sourceUrl: string) {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0',
      Accept: '*/*',
      ...media.headers,
    }

    const referrer = String(headers.Referer || headers.referer || media.pageUrl || '')
    if (referrer) {
      headers.Referer = referrer
      delete headers.referer
      try {
        if (!headers.Origin) headers.Origin = new URL(referrer).origin
      } catch {
        // ignore
      }
    }

    if (!headers.Referer) {
      try {
        const u = new URL(sourceUrl)
        headers.Referer = `${u.origin}/`
        if (!headers.Origin) headers.Origin = u.origin
      } catch {
        // ignore
      }
    }

    return headers
  }

  @Post('extract')
  async extract(@Body() body: any) {
    const apiBase = process.env.API_BASE_URL || 'http://localhost:4000'
    const result = await this.service.extract(String(body?.url || ''))

    return {
      platform: result.platform,
      title: result.title,
      items: result.items.map((item, index) => {
        return {
          id: item.id,
          type: item.type,
          width: item.width,
          height: item.height,
          durationSeconds: item.durationSeconds,
          mediaUrl: `${apiBase}/7mlny/media?ref=${encodeURIComponent(item.mediaRef)}`,
          downloadUrl: `${apiBase}/7mlny/download?ref=${encodeURIComponent(item.mediaRef)}&name=${encodeURIComponent(result.title || 'media')}-${index + 1}`,
        }
      }),
    }
  }

  @Get('media')
  async media(@Query('ref') ref?: string, @Res() res?: Response) {
    const refId = String(ref || '')
    const media = this.service.getMediaRef(refId)
    const headers = this.buildUpstreamHeaders(media, media.sourceUrl)
    const upstream = await fetch(media.sourceUrl, {
      headers,
    })
    if (!upstream.ok) {
      if ([401, 403, 429].includes(upstream.status)) {
        const local = await this.service.getOrCreateLocalFallback(refId)
        res!.setHeader('Content-Type', local.contentType)
        res!.setHeader('Cache-Control', 'public, max-age=3600')
        fs.createReadStream(local.filePath).pipe(res!)
        return
      }
      throw new BadRequestException(`Upstream status ${upstream.status}`)
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    const contentLength = upstream.headers.get('content-length')
    res!.setHeader('Content-Type', contentType)
    res!.setHeader('Cache-Control', 'public, max-age=3600')
    if (contentLength) res!.setHeader('Content-Length', contentLength)

    if (!upstream.body) {
      const buf = Buffer.from(await upstream.arrayBuffer())
      res!.send(buf)
      return
    }

    Readable.fromWeb(upstream.body as any).pipe(res!)
  }

  @Get('download')
  async download(@Query('ref') ref?: string, @Query('name') name?: string, @Res() res?: Response) {
    const refId = String(ref || '')
    const media = this.service.getMediaRef(refId)
    const headers = this.buildUpstreamHeaders(media, media.sourceUrl)
    const upstream = await fetch(media.sourceUrl, {
      headers,
    })
    if (!upstream.ok) {
      if ([401, 403, 429].includes(upstream.status)) {
        const local = await this.service.getOrCreateLocalFallback(refId)
        const base = String(name || 'download').replace(/[^a-zA-Z0-9._-]+/g, '_')
        const suggested = local.ext && !base.toLowerCase().endsWith(`.${local.ext}`) ? `${base}.${local.ext}` : base
        res!.setHeader('Content-Type', local.contentType)
        res!.setHeader('Content-Disposition', `attachment; filename="${suggested}"`)
        fs.createReadStream(local.filePath).pipe(res!)
        return
      }
      throw new BadRequestException(`Upstream status ${upstream.status}`)
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    const contentLength = upstream.headers.get('content-length')

    const extFromMime = contentType.includes('video/mp4')
      ? 'mp4'
      : contentType.includes('video/webm')
        ? 'webm'
        : contentType.includes('image/jpeg')
          ? 'jpg'
          : contentType.includes('image/png')
            ? 'png'
            : contentType.includes('image/webp')
              ? 'webp'
              : ''

    const ext = String(media.ext || extFromMime || '').toLowerCase()
    const base = String(name || 'download').replace(/[^a-zA-Z0-9._-]+/g, '_')
    const suggested = ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base

    res!.setHeader('Content-Type', contentType)
    res!.setHeader('Content-Disposition', `attachment; filename="${suggested}"`)
    if (contentLength) res!.setHeader('Content-Length', contentLength)

    if (!upstream.body) {
      const buf = Buffer.from(await upstream.arrayBuffer())
      res!.send(buf)
      return
    }

    Readable.fromWeb(upstream.body as any).pipe(res!)
  }
}
