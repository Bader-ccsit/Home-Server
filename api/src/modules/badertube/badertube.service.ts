import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import * as ytdl from '@distube/ytdl-core'
import * as path from 'path'
import * as fs from 'fs'
import YTDlpWrap from 'yt-dlp-wrap'

type RawVideo = {
  videoId?: string
  title?: string
  author?: string
  authorId?: string
  viewCount?: number
  viewCountText?: string
  lengthSeconds?: number
  videoThumbnails?: Array<{ quality?: string; url?: string }>
}

type BaderTubeVideo = {
  id: string
  title: string
  author: string
  views: string
  duration: string
  thumbnail: string
}

type DownloadOption = {
  quality: string
  mimeType: string
  container: string
  url: string
}

type VideoDetails = {
  id: string
  title: string
  author: string
  views: string
  duration: string
  thumbnail: string
  description: string
  likes: string
  dislikes: string
}

type PipedVideo = {
  url?: string
  title?: string
  uploaderName?: string
  views?: number
  duration?: number
  thumbnail?: string
}

type YouTubeRenderer = {
  videoId?: string
  title?: { runs?: Array<{ text?: string }>; simpleText?: string }
  ownerText?: { runs?: Array<{ text?: string }> }
  viewCountText?: { simpleText?: string }
  lengthText?: { simpleText?: string }
  thumbnail?: { thumbnails?: Array<{ url?: string }> }
}

@Injectable()
export class BaderTubeService {
  private ytDlpWrap: YTDlpWrap | null = null
  private ytDlpReady = false

  private readonly invidiousInstances: string[] = (
    process.env.BADERTUBE_API_BASES ||
    'https://invidious.fdn.fr,https://invidious.privacyredirect.com,https://invidious.jing.rocks'
  )
    .split(',')
    .map(v => v.trim().replace(/\/+$/g, ''))
    .filter(Boolean)

  private readonly pipedInstances: string[] = (
    process.env.BADERTUBE_PIPED_BASES ||
    'https://pipedapi.kavin.rocks,https://pipedapi-libre.kavin.rocks'
  )
    .split(',')
    .map(v => v.trim().replace(/\/+$/g, ''))
    .filter(Boolean)

  private formatViews(n?: number, text?: string) {
    if (text && text.trim()) return text
    if (!n) return '0'
    return new Intl.NumberFormat('en').format(n)
  }

  private formatDuration(seconds?: number) {
    if (!seconds || seconds <= 0) return '--'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  private mapVideo(v: RawVideo): BaderTubeVideo | null {
    if (!v?.videoId) return null
    const thumb = v.videoThumbnails?.find(t => t.quality === 'maxresdefault')?.url
      || v.videoThumbnails?.find(t => t.quality === 'high')?.url
      || v.videoThumbnails?.[0]?.url
      || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`

    return {
      id: v.videoId,
      title: v.title || 'Untitled',
      author: v.author || 'Unknown',
      views: this.formatViews(v.viewCount, v.viewCountText),
      duration: this.formatDuration(v.lengthSeconds),
      thumbnail: thumb,
    }
  }

  private extractVideoIdFromUrl(url: string) {
    const m = /(?:v=|\/watch\?v=|\/embed\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(url)
    return m?.[1] || ''
  }

  private normalizeThumb(url?: string, id?: string) {
    if (url && url.startsWith('//')) return `https:${url}`
    if (url) return url
    return `https://i.ytimg.com/vi/${id || ''}/hqdefault.jpg`
  }

  private mapYouTubeRenderer(v: YouTubeRenderer): BaderTubeVideo | null {
    const id = v?.videoId || ''
    if (!id) return null
    const title = v.title?.runs?.[0]?.text || v.title?.simpleText || 'Untitled'
    const author = v.ownerText?.runs?.[0]?.text || 'Unknown'
    const views = v.viewCountText?.simpleText || '0'
    const duration = v.lengthText?.simpleText || '--'
    const thumbnail = this.normalizeThumb(v.thumbnail?.thumbnails?.[v.thumbnail?.thumbnails?.length - 1]?.url, id)
    return { id, title, author, views, duration, thumbnail }
  }

  private extractRendererObjects(html: string, key: 'videoRenderer' | 'compactVideoRenderer') {
    const out: YouTubeRenderer[] = []
    const marker = `"${key}":{`
    let idx = html.indexOf(marker)
    while (idx !== -1) {
      const start = idx + marker.length - 1
      let depth = 0
      let end = start
      for (let i = start; i < html.length; i++) {
        const ch = html[i]
        if (ch === '{') depth++
        if (ch === '}') {
          depth--
          if (depth === 0) {
            end = i
            break
          }
        }
      }

      const block = html.slice(start, end + 1)
      try {
        out.push(JSON.parse(block) as YouTubeRenderer)
      } catch {
        // ignore invalid segment
      }

      idx = html.indexOf(marker, end + 1)
    }
    return out
  }

  private async searchFromYouTubeHtml(query: string) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en&gl=US`
    const html = await this.fetchText(url)
    const renderers = this.extractRendererObjects(html, 'videoRenderer')
    return renderers.map(v => this.mapYouTubeRenderer(v)).filter(Boolean).slice(0, 36)
  }

  private async recommendationsFromYouTubeHtml(videoId: string) {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en&gl=US`
    const html = await this.fetchText(url)
    const compact = this.extractRendererObjects(html, 'compactVideoRenderer')
    if (compact.length > 0) return compact.map(v => this.mapYouTubeRenderer(v)).filter(Boolean).slice(0, 36)
    const normal = this.extractRendererObjects(html, 'videoRenderer')
    return normal.map(v => this.mapYouTubeRenderer(v)).filter(Boolean).slice(0, 36)
  }

  private mapPipedVideo(v: PipedVideo): BaderTubeVideo | null {
    const id = this.extractVideoIdFromUrl(v.url || '')
    if (!id) return null
    return {
      id,
      title: v.title || 'Untitled',
      author: v.uploaderName || 'Unknown',
      views: this.formatViews(v.views),
      duration: this.formatDuration(v.duration),
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    }
  }

  private normalizeStreamUrl(url?: string) {
    if (!url) return ''
    if (url.startsWith('//')) return `https:${url}`
    return url
  }

  private sortByQualityDesc(a: DownloadOption, b: DownloadOption) {
    const aNum = Number((a.quality.match(/\d+/) || ['0'])[0])
    const bNum = Number((b.quality.match(/\d+/) || ['0'])[0])
    return bNum - aNum
  }

  private htmlUnescape(input: string) {
    return input
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  }

  private detailsFromYouTubeHtml(videoId: string, html: string): VideoDetails {
    const title = /<title>([^<]+)<\/title>/.exec(html)?.[1]?.replace(/ - YouTube$/, '') || 'Untitled'
    const author = /"ownerChannelName":"([^"]+)"/.exec(html)?.[1] || 'Unknown'
    const viewCount = /"viewCount":"([0-9]+)"/.exec(html)?.[1]
    const shortDescriptionRaw = /"shortDescription":"([\s\S]*?)"/.exec(html)?.[1] || ''
    const likeLabel = /"label":"([0-9,\.]+\s+likes?)"/.exec(html)?.[1] || ''
    const desc = this.htmlUnescape(shortDescriptionRaw)

    return {
      id: videoId,
      title,
      author,
      views: this.formatViews(viewCount ? Number(viewCount) : 0),
      duration: '--',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      description: desc,
      likes: likeLabel || '-',
      dislikes: '-',
    }
  }

  private parseInitialPlayerResponse(html: string): any | null {
    const m = /ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});/.exec(html)
    if (!m?.[1]) return null
    try {
      return JSON.parse(m[1])
    } catch {
      return null
    }
  }

  private parseContainerFromMime(mimeType: string) {
    const m = /video\/([a-zA-Z0-9]+)/.exec(mimeType || '')
    return m?.[1] || 'mp4'
  }

  private extractDownloadUrl(stream: any) {
    if (stream?.url) return this.normalizeStreamUrl(stream.url)
    const cipher = stream?.signatureCipher || stream?.cipher
    if (!cipher) return ''
    const params = new URLSearchParams(cipher)
    const direct = params.get('url')
    const s = params.get('s')
    // If signature deciphering is required, skip this stream.
    if (!direct || s) return ''
    return this.normalizeStreamUrl(direct)
  }

  private async downloadOptionsFromYouTubeHtml(videoId: string): Promise<DownloadOption[]> {
    const html = await this.fetchText(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en&gl=US`)
    const player = this.parseInitialPlayerResponse(html)
    const streaming = player?.streamingData
    const list = [
      ...(Array.isArray(streaming?.formats) ? streaming.formats : []),
      ...(Array.isArray(streaming?.adaptiveFormats) ? streaming.adaptiveFormats : []),
    ]

    const mapped: DownloadOption[] = list
      .map((s: any) => {
        const mimeType = String(s?.mimeType || 'video/mp4').split(';')[0]
        const url = this.extractDownloadUrl(s)
        return {
          quality: s?.qualityLabel || s?.quality || 'auto',
          mimeType,
          container: this.parseContainerFromMime(mimeType),
          url,
        }
      })
      .filter((s: DownloadOption) => !!s.url && /^video\//.test(s.mimeType))

    const unique: DownloadOption[] = Array.from(
      new Map<string, DownloadOption>(mapped.map(x => [`${x.quality}-${x.container}`, x])).values(),
    )
    return unique.sort((a, b) => this.sortByQualityDesc(a, b)).slice(0, 16)
  }

  private async fetchJson(url: string) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`Upstream status ${res.status}`)
      return await res.json()
    } finally {
      clearTimeout(timeout)
    }
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
      // binary is missing/broken; try downloading latest release
      await YTDlpWrap.downloadFromGithub(binPath)
      this.ytDlpWrap = new YTDlpWrap(binPath)
      await this.ytDlpWrap.getVersion()
      this.ytDlpReady = true
      return this.ytDlpWrap
    }
  }

  private async downloadOptionsFromYtDlp(videoId: string): Promise<DownloadOption[]> {
    const y = await this.ensureYtDlp()
    const url = `https://www.youtube.com/watch?v=${videoId}`
    const jsonText = await y.execPromise(['-J', '--no-playlist', url])
    const info = JSON.parse(jsonText || '{}')
    const formats = Array.isArray(info?.formats) ? info.formats : []

    const mapped: DownloadOption[] = formats
      .filter((f: any) => f?.url && (f?.vcodec && f.vcodec !== 'none'))
      .map((f: any) => {
        const mimeType = String(f?.ext ? `video/${f.ext}` : f?.format_note?.includes('webm') ? 'video/webm' : 'video/mp4')
        const quality = f?.format_note || f?.height ? `${f.height || ''}p` : (f?.format_id || 'auto')
        return {
          quality,
          mimeType,
          container: f?.ext || this.parseContainerFromMime(mimeType),
          url: this.normalizeStreamUrl(f?.url),
        }
      })
      .filter((f: DownloadOption) => !!f.url)

    const unique: DownloadOption[] = Array.from(
      new Map<string, DownloadOption>(mapped.map(x => [`${x.quality}-${x.container}`, x])).values(),
    )
    return unique.sort((a, b) => this.sortByQualityDesc(a, b)).slice(0, 20)
  }

  private async fetchText(url: string) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
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

  private async fetchVotes(videoId: string): Promise<{ likes?: string; dislikes?: string }> {
    try {
      const res = await this.fetchJson(`https://returnyoutubedislikeapi.com/votes?videoId=${encodeURIComponent(videoId)}`)
      const likes = res?.likes != null ? this.formatViews(Number(res.likes)) : undefined
      const dislikes = res?.dislikes != null ? this.formatViews(Number(res.dislikes)) : undefined
      return { likes, dislikes }
    } catch {
      return {}
    }
  }

  private async tryFetch(path: string, bases: string[]) {
    let lastErr: any = null

    for (const base of bases) {
      try {
        return await this.fetchJson(`${base}${path}`)
      } catch (err) {
        lastErr = err
      }
    }

    throw new Error(`Upstream unavailable: ${String(lastErr || 'unknown error')}`)
  }

  async search(query: string) {
    const q = (query || '').trim()
    if (!q) return []

    try {
      const data = await this.tryFetch(`/api/v1/search?q=${encodeURIComponent(q)}&type=video`, this.invidiousInstances)
      if (!Array.isArray(data)) return []
      return data
        .map((v: RawVideo) => this.mapVideo(v))
        .filter(Boolean)
        .slice(0, 36)
    } catch {
      try {
        const data = await this.tryFetch(`/search?q=${encodeURIComponent(q)}&filter=videos`, this.pipedInstances)
        if (!Array.isArray(data)) return []
        return data
          .map((v: PipedVideo) => this.mapPipedVideo(v))
          .filter(Boolean)
          .slice(0, 36)
      } catch (err) {
        try {
          return await this.searchFromYouTubeHtml(q)
        } catch (htmlErr) {
          throw new ServiceUnavailableException(`BaderTube search unavailable: ${String(htmlErr || err || 'unknown error')}`)
        }
      }
    }
  }

  async trending() {
    try {
      const data = await this.tryFetch('/api/v1/trending?type=Default', this.invidiousInstances)
      if (!Array.isArray(data)) return []
      return data
        .map((v: RawVideo) => this.mapVideo(v))
        .filter(Boolean)
        .slice(0, 36)
    } catch {
      try {
        const data = await this.tryFetch('/trending?region=US', this.pipedInstances)
        if (!Array.isArray(data)) return []
        return data
          .map((v: PipedVideo) => this.mapPipedVideo(v))
          .filter(Boolean)
          .slice(0, 36)
      } catch (err) {
        try {
          // Fallback approximation for trending when upstream APIs are unavailable.
          return await this.searchFromYouTubeHtml('trending now')
        } catch (htmlErr) {
          throw new ServiceUnavailableException(`BaderTube trending unavailable: ${String(htmlErr || err || 'unknown error')}`)
        }
      }
    }
  }

  async recommendations(videoId: string) {
    const id = (videoId || '').trim()
    if (!id) return []

    try {
      const data = await this.tryFetch(`/api/v1/videos/${encodeURIComponent(id)}`, this.invidiousInstances)
      const list = Array.isArray(data?.recommendedVideos) ? data.recommendedVideos : []
      return list
        .map((v: RawVideo) => this.mapVideo(v))
        .filter(Boolean)
        .slice(0, 36)
    } catch {
      try {
        const data = await this.tryFetch(`/streams/${encodeURIComponent(id)}`, this.pipedInstances)
        const list = Array.isArray(data?.relatedStreams) ? data.relatedStreams : []
        return list
          .map((v: PipedVideo) => this.mapPipedVideo(v))
          .filter(Boolean)
          .slice(0, 36)
      } catch (err) {
        try {
          return await this.recommendationsFromYouTubeHtml(id)
        } catch (htmlErr) {
          throw new ServiceUnavailableException(`BaderTube recommendations unavailable: ${String(htmlErr || err || 'unknown error')}`)
        }
      }
    }
  }

  async videoDetails(videoId: string): Promise<VideoDetails> {
    const id = (videoId || '').trim()
    if (!id) throw new ServiceUnavailableException('Missing video id')

    try {
      const data: any = await this.tryFetch(`/api/v1/videos/${encodeURIComponent(id)}`, this.invidiousInstances)
      const votes = await this.fetchVotes(id)
      return {
        id,
        title: data?.title || 'Untitled',
        author: data?.author || 'Unknown',
        views: this.formatViews(data?.viewCount),
        duration: this.formatDuration(data?.lengthSeconds),
        thumbnail: this.normalizeThumb(data?.videoThumbnails?.[data?.videoThumbnails?.length - 1]?.url, id),
        description: data?.description || '',
        likes: votes.likes || (data?.likeCount != null ? this.formatViews(Number(data.likeCount)) : '0'),
        dislikes: votes.dislikes || (data?.dislikeCount != null ? this.formatViews(Number(data.dislikeCount)) : '0'),
      }
    } catch {
      try {
        const data: any = await this.tryFetch(`/streams/${encodeURIComponent(id)}`, this.pipedInstances)
        const votes = await this.fetchVotes(id)
        return {
          id,
          title: data?.title || 'Untitled',
          author: data?.uploader || data?.uploaderName || 'Unknown',
          views: this.formatViews(data?.views),
          duration: this.formatDuration(data?.duration),
          thumbnail: this.normalizeThumb(data?.thumbnailUrl || data?.thumbnail, id),
          description: data?.description || '',
          likes: votes.likes || (data?.likes != null ? this.formatViews(Number(data.likes)) : '0'),
          dislikes: votes.dislikes || (data?.dislikes != null ? this.formatViews(Number(data.dislikes)) : '0'),
        }
      } catch {
        try {
          const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`)
          const vd: any = info?.videoDetails || {}
          const votes = await this.fetchVotes(id)
          return {
            id,
            title: vd.title || 'Untitled',
            author: vd.author?.name || 'Unknown',
            views: this.formatViews(vd.viewCount ? Number(vd.viewCount) : 0),
            duration: this.formatDuration(vd.lengthSeconds ? Number(vd.lengthSeconds) : 0),
            thumbnail: vd.thumbnails?.[vd.thumbnails?.length - 1]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            description: vd.description || '',
            likes: votes.likes || (vd.likes != null ? this.formatViews(Number(vd.likes)) : '0'),
            dislikes: votes.dislikes || '0',
          }
        } catch {
          try {
            const html = await this.fetchText(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}&hl=en&gl=US`)
            const base = this.detailsFromYouTubeHtml(id, html)
            const votes = await this.fetchVotes(id)
            return {
              ...base,
              likes: votes.likes || base.likes || '0',
              dislikes: votes.dislikes || base.dislikes || '0',
            }
          } catch (err) {
            throw new ServiceUnavailableException(`BaderTube video metadata unavailable: ${String(err || 'unknown error')}`)
          }
        }
      }
    }
  }

  async downloadOptions(videoId: string): Promise<DownloadOption[]> {
    const id = (videoId || '').trim()
    if (!id) return []

    try {
      const data: any = await this.tryFetch(`/api/v1/videos/${encodeURIComponent(id)}`, this.invidiousInstances)
      const list = Array.isArray(data?.formatStreams) ? data.formatStreams : []
      const mapped = list
        .map((s: any) => ({
          quality: s?.qualityLabel || s?.quality || 'auto',
          mimeType: s?.mimeType || 'video/mp4',
          container: s?.container || 'mp4',
          url: this.normalizeStreamUrl(s?.url),
        }))
        .filter((s: DownloadOption) => !!s.url)
      const unique: DownloadOption[] = Array.from(
        new Map<string, DownloadOption>(mapped.map((x: DownloadOption) => [`${x.quality}-${x.container}`, x])).values(),
      )
      return unique.sort((a, b) => this.sortByQualityDesc(a, b)).slice(0, 16)
    } catch {
      try {
        const data: any = await this.tryFetch(`/streams/${encodeURIComponent(id)}`, this.pipedInstances)
        const list = Array.isArray(data?.videoStreams) ? data.videoStreams : []
        const mapped = list
          .map((s: any) => ({
            quality: s?.quality || s?.qualityLabel || 'auto',
            mimeType: s?.mimeType || 'video/mp4',
            container: s?.format || 'mp4',
            url: this.normalizeStreamUrl(s?.url),
          }))
          .filter((s: DownloadOption) => !!s.url)
        const unique: DownloadOption[] = Array.from(
          new Map<string, DownloadOption>(mapped.map((x: DownloadOption) => [`${x.quality}-${x.container}`, x])).values(),
        )
        return unique.sort((a, b) => this.sortByQualityDesc(a, b)).slice(0, 16)
      } catch {
        try {
          const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`)
          const formats = Array.isArray(info?.formats) ? info.formats : []
          const mapped: DownloadOption[] = formats
            .filter((f: any) => !!f?.url && f?.hasVideo)
            .map((f: any) => ({
              quality: f?.qualityLabel || f?.quality || 'auto',
              mimeType: String(f?.mimeType || 'video/mp4').split(';')[0],
              container: f?.container || this.parseContainerFromMime(String(f?.mimeType || 'video/mp4')),
              url: this.normalizeStreamUrl(f?.url),
            }))
          const unique: DownloadOption[] = Array.from(
            new Map<string, DownloadOption>(mapped.map(x => [`${x.quality}-${x.container}`, x])).values(),
          )
          return unique.sort((a, b) => this.sortByQualityDesc(a, b)).slice(0, 16)
        } catch {
          try {
            const byYtDlp = await this.downloadOptionsFromYtDlp(id)
            if (byYtDlp.length > 0) return byYtDlp
            return await this.downloadOptionsFromYouTubeHtml(id)
          } catch {
            return []
          }
        }
      }
    }
  }
}
