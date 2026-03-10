import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import YTDlpWrap from 'yt-dlp-wrap'

type ExtractItem = {
  id: string
  type: 'video' | 'image'
  mediaRef: string
  ext?: string
  width?: number
  height?: number
  durationSeconds?: number
}

type ExtractResult = {
  platform: string
  title: string
  items: ExtractItem[]
}

type MediaRefEntry = {
  sourceUrl: string
  mediaType: 'video' | 'image'
  headers: Record<string, string>
  ext?: string
  pageUrl?: string
  expiresAt: number
}

type LocalFallbackFile = {
  filePath: string
  ext: string
  contentType: string
  expiresAt: number
}

@Injectable()
export class HmlnyService {
  private ytDlpWrap: YTDlpWrap | null = null
  private ytDlpReady = false
  private mediaRefs = new Map<string, MediaRefEntry>()
  private readonly mediaRefTtlMs = 20 * 60 * 1000
  private localFallbackFiles = new Map<string, LocalFallbackFile>()
  private readonly fallbackTtlMs = 20 * 60 * 1000

  private readonly imageExt = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif'])

  private sanitizeUrl(input: string) {
    const value = String(input || '').trim()
    if (!value) throw new BadRequestException('URL is required')

    let parsed: URL
    try {
      parsed = new URL(value)
    } catch {
      throw new BadRequestException('Invalid URL')
    }

    if (!/^https?:$/.test(parsed.protocol)) {
      throw new BadRequestException('Only http/https URLs are allowed')
    }

    return parsed.toString()
  }

  detectPlatform(input: string) {
    let host = ''
    try {
      host = new URL(input).hostname.toLowerCase().replace(/^www\./, '')
    } catch {
      return 'Other'
    }

    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube'
    if (host.includes('tiktok.com')) return 'TikTok'
    if (host.includes('instagram.com')) return 'Instagram'
    if (host.includes('snapchat.com')) return 'Snapchat'
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'Facebook'
    if (host.includes('twitter.com') || host.includes('x.com')) return 'X'
    return 'Other'
  }

  private async ensureYtDlp() {
    if (this.ytDlpReady && this.ytDlpWrap) return this.ytDlpWrap

    const binPath = path.join(process.cwd(), '.cache', 'yt-dlp.exe')
    const cacheDir = path.dirname(binPath)
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })

    try {
      this.ytDlpWrap = new YTDlpWrap(binPath)
      await this.ytDlpWrap.getVersion()
      this.ytDlpReady = true
      return this.ytDlpWrap
    } catch {
      await YTDlpWrap.downloadFromGithub(binPath)
      this.ytDlpWrap = new YTDlpWrap(binPath)
      await this.ytDlpWrap.getVersion()
      this.ytDlpReady = true
      return this.ytDlpWrap
    }
  }

  private extFromUrl(url: string) {
    try {
      const pathname = new URL(url).pathname
      const ext = pathname.split('.').pop() || ''
      return ext.toLowerCase()
    } catch {
      return ''
    }
  }

  private normalizeMaybeUrl(raw: string) {
    const value = String(raw || '').trim()
    if (!value) return ''
    if (value.startsWith('//')) return `https:${value}`
    return value
  }

  private async fetchText(url: string) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
      if (!res.ok) throw new Error(`Upstream status ${res.status}`)
      return await res.text()
    } finally {
      clearTimeout(timeout)
    }
  }

  private async fetchJson(url: string, init?: RequestInit) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        ...init,
      })
      if (!res.ok) throw new Error(`Upstream status ${res.status}`)
      return await res.json()
    } finally {
      clearTimeout(timeout)
    }
  }

  private parseJsonObjectAfterMarker(html: string, marker: string): any | null {
    const markerIndex = html.indexOf(marker)
    if (markerIndex === -1) return null

    const start = html.indexOf('{', markerIndex + marker.length)
    if (start === -1) return null

    let depth = 0
    let inString = false
    let escaped = false

    for (let i = start; i < html.length; i++) {
      const ch = html[i]
      if (inString) {
        if (escaped) {
          escaped = false
        } else if (ch === '\\') {
          escaped = true
        } else if (ch === '"') {
          inString = false
        }
        continue
      }

      if (ch === '"') {
        inString = true
        continue
      }

      if (ch === '{') depth++
      if (ch === '}') {
        depth--
        if (depth === 0) {
          const candidate = html.slice(start, i + 1)
          try {
            return JSON.parse(candidate)
          } catch {
            return null
          }
        }
      }
    }

    return null
  }

  private htmlDecode(input: string) {
    return String(input || '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  }

  private extractOgMeta(html: string, key: string) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, 'i'),
    ]

    for (const p of patterns) {
      const m = p.exec(html)
      if (m?.[1]) return this.htmlDecode(m[1])
    }
    return ''
  }

  private async extractFromOpenGraph(pageUrl: string, platform: string): Promise<ExtractResult | null> {
    const html = await this.fetchText(pageUrl)

    const ogTitle = this.extractOgMeta(html, 'og:title')
    const ogDesc = this.extractOgMeta(html, 'og:description')
    const ogVideo = this.normalizeMaybeUrl(this.extractOgMeta(html, 'og:video:secure_url') || this.extractOgMeta(html, 'og:video'))
    const ogImage = this.normalizeMaybeUrl(this.extractOgMeta(html, 'og:image:secure_url') || this.extractOgMeta(html, 'og:image'))

    const headers = {
      Referer: pageUrl,
      Origin: new URL(pageUrl).origin,
      'User-Agent': 'Mozilla/5.0',
    }

    const items: ExtractItem[] = []
    if (ogVideo) {
      const ext = this.extFromUrl(ogVideo) || 'mp4'
      const mediaRef = this.registerMediaRef({
        sourceUrl: ogVideo,
        mediaType: 'video',
        headers,
        ext,
        pageUrl,
      })
      items.push({ id: 'og-video', type: 'video', mediaRef, ext })
    }

    if (!items.length && ogImage) {
      const ext = this.extFromUrl(ogImage) || 'jpg'
      const mediaRef = this.registerMediaRef({
        sourceUrl: ogImage,
        mediaType: 'image',
        headers,
        ext,
        pageUrl,
      })
      items.push({ id: 'og-image', type: 'image', mediaRef, ext })
    }

    if (!items.length) return null

    return {
      platform,
      title: ogTitle || ogDesc || `${platform} post`,
      items,
    }
  }

  private buildInstagramItemsFromNode(node: any, pageUrl: string): ExtractItem[] {
    const refs: Array<{ id: string; type: 'video' | 'image'; url: string; ext?: string; width?: number; height?: number; durationSeconds?: number }> = []

    const pushNode = (n: any, fallbackId: string) => {
      const isVideo = !!n?.is_video
      const videoUrl = this.normalizeMaybeUrl(String(n?.video_url || ''))
      const imageUrl = this.normalizeMaybeUrl(
        String(
          n?.display_url
          || n?.thumbnail_src
          || (Array.isArray(n?.display_resources) ? n.display_resources[n.display_resources.length - 1]?.src : '')
          || '',
        ),
      )

      if (isVideo && videoUrl) {
        refs.push({
          id: String(n?.id || fallbackId),
          type: 'video',
          url: videoUrl,
          ext: String(n?.video_url?.split('?')[0]?.split('.').pop() || 'mp4').toLowerCase(),
          width: Number(n?.dimensions?.width || 0) || undefined,
          height: Number(n?.dimensions?.height || 0) || undefined,
          durationSeconds: Number(n?.video_duration || 0) || undefined,
        })
        return
      }

      if (imageUrl) {
        refs.push({
          id: String(n?.id || fallbackId),
          type: 'image',
          url: imageUrl,
          ext: this.extFromUrl(imageUrl) || 'jpg',
          width: Number(n?.dimensions?.width || 0) || undefined,
          height: Number(n?.dimensions?.height || 0) || undefined,
        })
      }
    }

    const edges = Array.isArray(node?.edge_sidecar_to_children?.edges)
      ? node.edge_sidecar_to_children.edges
      : []

    if (edges.length > 0) {
      edges.forEach((edge: any, idx: number) => pushNode(edge?.node || {}, `ig-${idx + 1}`))
    } else {
      pushNode(node || {}, 'ig-1')
    }

    const headers = {
      Referer: pageUrl,
      Origin: new URL(pageUrl).origin,
      'User-Agent': 'Mozilla/5.0',
    }

    return refs.map(r => {
      const mediaRef = this.registerMediaRef({
        sourceUrl: r.url,
        mediaType: r.type,
        headers,
        ext: r.ext,
        pageUrl,
      })
      return {
        id: r.id,
        type: r.type,
        mediaRef,
        ext: r.ext,
        width: r.width,
        height: r.height,
        durationSeconds: r.durationSeconds,
      }
    })
  }

  private async extractInstagramFromHtml(pageUrl: string): Promise<ExtractResult | null> {
    const html = await this.fetchText(pageUrl)
    const node = this.parseJsonObjectAfterMarker(html, '"xdt_shortcode_media":')
    if (!node) return null

    const items = this.buildInstagramItemsFromNode(node, pageUrl)
    if (!items.length) return null

    const caption = String(node?.accessibility_caption || node?.edge_media_to_caption?.edges?.[0]?.node?.text || '').trim()
    const title = caption || 'Instagram post'

    return {
      platform: 'Instagram',
      title,
      items,
    }
  }

  private parseJsonScriptById(html: string, id: string): any | null {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`<script[^>]*id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i')
    const m = re.exec(html)
    if (!m?.[1]) return null
    try {
      return JSON.parse(m[1])
    } catch {
      return null
    }
  }

  private findObjectDeep(input: any, predicate: (obj: any) => boolean): any | null {
    if (!input || typeof input !== 'object') return null
    if (predicate(input)) return input

    if (Array.isArray(input)) {
      for (const item of input) {
        const hit = this.findObjectDeep(item, predicate)
        if (hit) return hit
      }
      return null
    }

    for (const value of Object.values(input)) {
      const hit = this.findObjectDeep(value, predicate)
      if (hit) return hit
    }
    return null
  }

  private pickFirstUrlFromLists(...candidates: any[]) {
    for (const c of candidates) {
      if (!c) continue
      if (typeof c === 'string') {
        const u = this.normalizeMaybeUrl(c)
        if (u.startsWith('http://') || u.startsWith('https://')) return u
      }
      if (Array.isArray(c)) {
        for (const item of c) {
          const u = this.pickFirstUrlFromLists(item)
          if (u) return u
        }
      }
      if (typeof c === 'object') {
        const u = this.pickFirstUrlFromLists(c.url, c.urlList, c.originUrl, c.downloadAddr, c.playAddr)
        if (u) return u
      }
    }
    return ''
  }

  private async extractTikTokFromHtml(pageUrl: string): Promise<ExtractResult | null> {
    const html = await this.fetchText(pageUrl)

    const universal = this.parseJsonScriptById(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__')
    const nextData = this.parseJsonScriptById(html, '__NEXT_DATA__')

    const itemObj = this.findObjectDeep(universal || nextData, (obj: any) => {
      return !!(obj && (obj.video || obj.imagePost || obj.images || obj.imagePostCover))
    })

    if (!itemObj) return null

    const title = String(
      itemObj?.desc
      || itemObj?.title
      || itemObj?.seoDescription
      || this.extractOgMeta(html, 'og:title')
      || this.extractOgMeta(html, 'og:description')
      || 'TikTok post',
    ).trim()

    const headers = {
      Referer: pageUrl,
      Origin: new URL(pageUrl).origin,
      'User-Agent': 'Mozilla/5.0',
    }

    const rawImages: any[] = []
    if (Array.isArray(itemObj?.imagePost?.images)) rawImages.push(...itemObj.imagePost.images)
    if (Array.isArray(itemObj?.images)) rawImages.push(...itemObj.images)

    const items: ExtractItem[] = []

    if (rawImages.length > 0) {
      rawImages.forEach((img: any, idx: number) => {
        const imgUrl = this.pickFirstUrlFromLists(img?.imageURL?.urlList, img?.imageURL?.url, img?.urlList, img?.url, img?.displayImage?.urlList)
        if (!imgUrl) return
        const ext = this.extFromUrl(imgUrl) || 'jpg'
        const mediaRef = this.registerMediaRef({
          sourceUrl: imgUrl,
          mediaType: 'image',
          headers,
          ext,
          pageUrl,
        })

        items.push({
          id: String(img?.imageId || img?.id || `tt-image-${idx + 1}`),
          type: 'image',
          mediaRef,
          ext,
        })
      })
    }

    if (!items.length) {
      const videoUrl = this.pickFirstUrlFromLists(
        itemObj?.video?.playAddr,
        itemObj?.video?.downloadAddr,
        itemObj?.video?.playAddrH264,
      )

      if (videoUrl) {
        const ext = this.extFromUrl(videoUrl) || 'mp4'
        const mediaRef = this.registerMediaRef({
          sourceUrl: videoUrl,
          mediaType: 'video',
          headers,
          ext,
          pageUrl,
        })
        items.push({
          id: String(itemObj?.id || 'tt-video-1'),
          type: 'video',
          mediaRef,
          ext,
          durationSeconds: Number(itemObj?.video?.duration || 0) || undefined,
        })
      }
    }

    if (!items.length) return null

    return {
      platform: 'TikTok',
      title,
      items,
    }
  }

  private cleanTikTokUrl(url: string) {
    try {
      const u = new URL(url)
      u.search = ''
      u.hash = ''
      return u.toString()
    } catch {
      return url
    }
  }

  private async extractTikTokFromApi(pageUrl: string): Promise<ExtractResult | null> {
    const cleanUrl = this.cleanTikTokUrl(pageUrl)
    const body = new URLSearchParams({
      url: cleanUrl,
      hd: '1',
    }).toString()

    const data = await this.fetchJson('https://www.tikwm.com/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body,
    })

    if (!data || Number(data?.code) !== 0 || !data?.data) return null
    const d = data.data

    const title = String(d?.title || d?.desc || 'TikTok post').trim() || 'TikTok post'
    const headers = {
      Referer: cleanUrl,
      Origin: 'https://www.tikwm.com',
      'User-Agent': 'Mozilla/5.0',
    }

    const items: ExtractItem[] = []

    const imagesRaw = Array.isArray(d?.images) ? d.images : []
    imagesRaw.forEach((img: any, idx: number) => {
      const imgUrl = this.normalizeMaybeUrl(String(img || ''))
      if (!imgUrl) return
      const ext = this.extFromUrl(imgUrl) || 'jpg'
      const mediaRef = this.registerMediaRef({
        sourceUrl: imgUrl,
        mediaType: 'image',
        headers,
        ext,
        pageUrl: cleanUrl,
      })
      items.push({
        id: `tt-api-image-${idx + 1}`,
        type: 'image',
        mediaRef,
        ext,
      })
    })

    // For photo posts with audio, many providers return a slideshow video URL.
    const videoUrl = this.normalizeMaybeUrl(String(d?.hdplay || d?.play || d?.wmplay || ''))
    if (videoUrl) {
      const ext = this.extFromUrl(videoUrl) || 'mp4'
      const mediaRef = this.registerMediaRef({
        sourceUrl: videoUrl,
        mediaType: 'video',
        headers,
        ext,
        pageUrl: cleanUrl,
      })
      items.push({
        id: 'tt-api-video-audio',
        type: 'video',
        mediaRef,
        ext,
      })
    }

    if (!items.length) return null

    return {
      platform: 'TikTok',
      title,
      items,
    }
  }

  private normalizeHeaders(input: any): Record<string, string> {
    const out: Record<string, string> = {}
    if (!input || typeof input !== 'object') return out

    for (const [k, v] of Object.entries(input)) {
      const key = String(k || '').trim()
      const val = String(v || '').trim()
      if (!key || !val) continue
      if (/^[a-zA-Z0-9-]+$/.test(key)) out[key] = val
    }

    return out
  }

  private isImageUrl(url: string, extHint?: string) {
    if (extHint && this.imageExt.has(String(extHint).toLowerCase())) return true
    const ext = this.extFromUrl(url)
    return this.imageExt.has(ext)
  }

  private pickBestMediaUrl(entry: any): { type: 'video' | 'image'; url: string; ext?: string; headers: Record<string, string> } | null {
    const entryHeaders = this.normalizeHeaders(entry?.http_headers)
    const direct = this.normalizeMaybeUrl(String(entry?.url || ''))
    if (direct.startsWith('http://') || direct.startsWith('https://')) {
      const directExt = String(entry?.ext || this.extFromUrl(direct)).toLowerCase()
      if (this.isImageUrl(direct, directExt)) {
        return { type: 'image', url: direct, ext: directExt || undefined, headers: entryHeaders }
      }
    }

    const formats = Array.isArray(entry?.formats) ? entry.formats : []

    const imageCandidates = formats.filter((f: any) => {
      const url = this.normalizeMaybeUrl(String(f?.url || ''))
      if (!url.startsWith('http://') && !url.startsWith('https://')) return false
      const ext = String(f?.ext || this.extFromUrl(url)).toLowerCase()
      return this.imageExt.has(ext)
    })
    const imageCandidate = imageCandidates.sort((a: any, b: any) => Number((b?.width || 0)) - Number((a?.width || 0)))[0]

    const videoCandidates = formats
      .filter((f: any) => {
        const url = this.normalizeMaybeUrl(String(f?.url || ''))
        if (!url.startsWith('http://') && !url.startsWith('https://')) return false
        return !!f?.vcodec && f.vcodec !== 'none'
      })
      .sort((a: any, b: any) => Number(b?.height || 0) - Number(a?.height || 0))

    const videoCandidate = videoCandidates[0]

    if (imageCandidate?.url && !videoCandidate?.url) {
      const ext = String(imageCandidate?.ext || this.extFromUrl(String(imageCandidate.url))).toLowerCase()
      return {
        type: 'image',
        url: String(imageCandidate.url),
        ext: ext || undefined,
        headers: this.normalizeHeaders(imageCandidate?.http_headers) || entryHeaders,
      }
    }

    if (videoCandidate?.url) {
      const ext = String(videoCandidate?.ext || this.extFromUrl(String(videoCandidate.url))).toLowerCase()
      return {
        type: 'video',
        url: String(videoCandidate.url),
        ext: ext || undefined,
        headers: this.normalizeHeaders(videoCandidate?.http_headers) || entryHeaders,
      }
    }

    // Some extractors expose image posts in thumbnail/display fields.
    const imageFallbacks = [
      String(entry?.display_url || ''),
      String(entry?.thumbnail || ''),
      String(Array.isArray(entry?.thumbnails) ? entry?.thumbnails?.[entry.thumbnails.length - 1]?.url || '' : ''),
    ].filter(Boolean)

    for (const imgUrl of imageFallbacks) {
      if ((imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) && this.isImageUrl(imgUrl)) {
        return { type: 'image', url: imgUrl, ext: this.extFromUrl(imgUrl) || undefined, headers: entryHeaders }
      }
    }

    if (direct.startsWith('http://') || direct.startsWith('https://')) {
      const ext = String(entry?.ext || this.extFromUrl(direct)).toLowerCase()
      return { type: this.isImageUrl(direct, ext) ? 'image' : 'video', url: direct, ext: ext || undefined, headers: entryHeaders }
    }

    return null
  }

  private flattenEntries(info: any): any[] {
    if (!info) return []
    const entries = Array.isArray(info?.entries) ? info.entries.filter(Boolean) : []
    if (!entries.length) return [info]

    const flat: any[] = []
    for (const e of entries) {
      const nested = this.flattenEntries(e)
      for (const n of nested) flat.push(n)
    }
    return flat
  }

  private purgeExpiredRefs() {
    const now = Date.now()
    for (const [id, item] of this.mediaRefs.entries()) {
      if (item.expiresAt <= now) this.mediaRefs.delete(id)
    }
  }

  private registerMediaRef(payload: { sourceUrl: string; mediaType: 'video' | 'image'; headers: Record<string, string>; ext?: string; pageUrl?: string }) {
    this.purgeExpiredRefs()
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`
    this.mediaRefs.set(id, {
      sourceUrl: payload.sourceUrl,
      mediaType: payload.mediaType,
      headers: payload.headers,
      ext: payload.ext,
      pageUrl: payload.pageUrl,
      expiresAt: Date.now() + this.mediaRefTtlMs,
    })
    return id
  }

  private buildItems(info: any, sourcePostUrl: string): ExtractItem[] {
    const entries = this.flattenEntries(info)
    const out: ExtractItem[] = []

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const picked = this.pickBestMediaUrl(entry)
      if (!picked) continue

      const mediaRef = this.registerMediaRef({
        sourceUrl: picked.url,
        mediaType: picked.type,
        headers: picked.headers,
        ext: picked.ext,
        pageUrl: String(entry?.webpage_url || info?.webpage_url || sourcePostUrl || ''),
      })

      out.push({
        id: String(entry?.id || `item-${i + 1}`),
        type: picked.type,
        mediaRef,
        ext: picked.ext,
        width: Number(entry?.width || 0) || undefined,
        height: Number(entry?.height || 0) || undefined,
        durationSeconds: Number(entry?.duration || 0) || undefined,
      })
    }

    return out
  }

  async extract(urlInput: string): Promise<ExtractResult> {
    const url = this.sanitizeUrl(urlInput)
    const platform = this.detectPlatform(url)

    try {
      const y = await this.ensureYtDlp()
      const jsonText = await y.execPromise(['-J', '--no-warnings', '--skip-download', '--extractor-retries', '2', url])
      const info = JSON.parse(jsonText || '{}')
      const items = this.buildItems(info, url)

      if (!items.length && platform === 'Instagram') {
        const fallback = await this.extractInstagramFromHtml(url)
        if (fallback?.items?.length) return fallback
      }

      if (!items.length && platform === 'TikTok') {
        const tiktokFallback = await this.extractTikTokFromHtml(url)
        if (tiktokFallback?.items?.length) return tiktokFallback

        const tiktokApiFallback = await this.extractTikTokFromApi(url)
        if (tiktokApiFallback?.items?.length) return tiktokApiFallback
      }

      if (!items.length && (platform === 'Instagram' || platform === 'TikTok')) {
        const ogFallback = await this.extractFromOpenGraph(url, platform)
        if (ogFallback?.items?.length) return ogFallback
      }

      if (!items.length) throw new ServiceUnavailableException('No downloadable media found in this URL')

      return {
        platform,
        title: String(info?.title || info?.fulltitle || info?.uploader || `${platform} post`),
        items,
      }
    } catch (err) {
      if (platform === 'Instagram') {
        try {
          const fallback = await this.extractInstagramFromHtml(url)
          if (fallback?.items?.length) return fallback
        } catch {
          // ignore fallback error and rethrow original path below
        }
      }
      if (platform === 'TikTok' || platform === 'Instagram') {
        try {
          if (platform === 'TikTok') {
            const tiktokFallback = await this.extractTikTokFromHtml(url)
            if (tiktokFallback?.items?.length) return tiktokFallback

            const tiktokApiFallback = await this.extractTikTokFromApi(url)
            if (tiktokApiFallback?.items?.length) return tiktokApiFallback
          }
          const ogFallback = await this.extractFromOpenGraph(url, platform)
          if (ogFallback?.items?.length) return ogFallback
        } catch {
          // ignore and rethrow below
        }
      }
      throw new ServiceUnavailableException(`Could not extract media from URL: ${String(err || 'unknown error')}`)
    }
  }

  validateSourceUrl(input: string) {
    return this.sanitizeUrl(input)
  }

  getMediaRef(id: string): { sourceUrl: string; mediaType: 'video' | 'image'; headers: Record<string, string>; ext?: string; pageUrl?: string } {
    this.purgeExpiredRefs()
    const row = this.mediaRefs.get(String(id || ''))
    if (!row) throw new BadRequestException('Media reference expired. Please search again.')
    return { sourceUrl: row.sourceUrl, mediaType: row.mediaType, headers: row.headers, ext: row.ext, pageUrl: row.pageUrl }
  }

  private mapExtToContentType(ext: string) {
    const e = String(ext || '').toLowerCase()
    if (e === 'mp4') return 'video/mp4'
    if (e === 'webm') return 'video/webm'
    if (e === 'mov') return 'video/quicktime'
    if (e === 'jpg' || e === 'jpeg') return 'image/jpeg'
    if (e === 'png') return 'image/png'
    if (e === 'webp') return 'image/webp'
    if (e === 'gif') return 'image/gif'
    return 'application/octet-stream'
  }

  private purgeLocalFallbacks() {
    const now = Date.now()
    for (const [ref, item] of this.localFallbackFiles.entries()) {
      if (item.expiresAt <= now || !fs.existsSync(item.filePath)) {
        this.localFallbackFiles.delete(ref)
        try {
          if (fs.existsSync(item.filePath)) fs.unlinkSync(item.filePath)
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }

  async getOrCreateLocalFallback(refId: string): Promise<{ filePath: string; ext: string; contentType: string }> {
    this.purgeLocalFallbacks()
    const key = String(refId || '')
    const cached = this.localFallbackFiles.get(key)
    if (cached && fs.existsSync(cached.filePath)) {
      return { filePath: cached.filePath, ext: cached.ext, contentType: cached.contentType }
    }

    const media = this.getMediaRef(key)
    if (!media.pageUrl) throw new BadRequestException('No fallback source URL available')

    const y = await this.ensureYtDlp()
    const fallbackDir = path.join(process.cwd(), '.cache', 'hmlny-media')
    if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true })

    const outTemplate = path.join(fallbackDir, `${key}.%(ext)s`)
    await y.execPromise(['--no-warnings', '--no-playlist', '--restrict-filenames', '-o', outTemplate, media.pageUrl])

    const files = fs.readdirSync(fallbackDir).filter(name => name.startsWith(`${key}.`))
    if (!files.length) throw new BadRequestException('Failed to generate fallback media file')

    // Pick the newest file matching the reference.
    const fullPaths = files.map(name => path.join(fallbackDir, name))
    fullPaths.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    const filePath = fullPaths[0]
    const ext = path.extname(filePath).replace('.', '').toLowerCase() || (media.ext || '')
    const contentType = this.mapExtToContentType(ext)

    this.localFallbackFiles.set(key, {
      filePath,
      ext,
      contentType,
      expiresAt: Date.now() + this.fallbackTtlMs,
    })

    return { filePath, ext, contentType }
  }
}
