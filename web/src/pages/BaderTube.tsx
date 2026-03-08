import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import FancyInput from '../components/FancyInput'
import { useI18n } from '../contexts/I18nContext'

type VideoItem = {
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

export default function BaderTube() {
  const { t } = useI18n()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [current, setCurrent] = useState<VideoItem | null>(null)
  const [details, setDetails] = useState<VideoDetails | null>(null)
  const [downloads, setDownloads] = useState<DownloadOption[]>([])
  const [showDescription, setShowDescription] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [selectedQuality, setSelectedQuality] = useState('')
  const [copied, setCopied] = useState(false)

  const embedUrl = useMemo(() => {
    if (!current?.id) return ''
    return `https://www.youtube-nocookie.com/embed/${current.id}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`
  }, [current])

  const youtubeUrl = useMemo(() => {
    if (!current?.id) return ''
    return `https://www.youtube.com/watch?v=${current.id}`
  }, [current])

  async function loadTrending() {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${apiBase}/badertube/trending`)
      const list = Array.isArray(res.data) ? res.data : []
      setVideos(list)
      if (!current && list.length > 0) {
        setCurrent(list[0])
      }
    } catch {
      setError(t('baderTubeSearchFailed'))
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  async function doSearch() {
    const q = query.trim()
    if (!q) return loadTrending()

    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${apiBase}/badertube/search`, { params: { q } })
      const list = Array.isArray(res.data) ? res.data : []
      setVideos(list)
      if (list.length > 0) setCurrent(list[0])
    } catch {
      setError(t('baderTubeSearchFailed'))
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  async function loadVideoMeta(videoId: string) {
    try {
      const metaRes = await axios.get(`${apiBase}/badertube/video/${encodeURIComponent(videoId)}`)
      setDetails(metaRes.data || null)
    } catch {
      setDetails(null)
    }

    try {
      const dlRes = await axios.get(`${apiBase}/badertube/downloads/${encodeURIComponent(videoId)}`)
      const dl = Array.isArray(dlRes.data) ? dlRes.data : []
      setDownloads(dl)
      setSelectedQuality(dl[0]?.quality || '')
    } catch {
      setDownloads([])
      setSelectedQuality('')
    }
  }

  useEffect(() => {
    loadTrending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!current?.id) return
    setShowDescription(false)
    setDownloadOpen(false)
    setCopied(false)
    loadVideoMeta(current.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  function selectVideo(v: VideoItem) {
    setCurrent(v)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function copyLink() {
    if (!youtubeUrl) return
    try {
      await navigator.clipboard.writeText(youtubeUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // ignore
    }
  }

  function downloadSelected() {
    if (!selectedQuality) return
    const selected = downloads.find(d => d.quality === selectedQuality) || downloads[0]
    if (!selected?.url) return
    window.open(selected.url, '_blank')
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('baderTubeTitle')}</h1>
        <p className="text-sm text-white/75">{t('baderTubeSubtitle')}</p>
      </div>

      <AnimatedCard className="p-6 mb-6">
        <div className="flex flex-col lg:flex-row items-end gap-4">
          <div className="w-full lg:flex-1">
            <FancyInput
              label={t('baderTubeExplore')}
              value={query}
              onChange={(e:any) => setQuery(e.target.value)}
              placeholder={t('baderTubeSearchPlaceholder')}
              onKeyDown={(e:any) => {
                if (e.key === 'Enter') doSearch()
              }}
            />
          </div>
          <AnimatedButton onClick={doSearch}>{t('driveSearch')}</AnimatedButton>
        </div>
        {error && <div className="text-rose-400 mt-2">{error}</div>}
      </AnimatedCard>

      {current && (
        <AnimatedCard className="p-4 mb-6">
          <div className="flex items-center justify-between mb-3 gap-4">
            <div className="text-sm font-semibold">{t('baderTubeNowPlaying')}</div>
            <a className="text-sm underline" href={youtubeUrl} target="_blank" rel="noreferrer">
              {t('baderTubeOpenOnYouTube')}
            </a>
          </div>

          <div className="relative w-full overflow-hidden rounded-xl border border-white/10 mb-4" style={{ paddingTop: '56.25%' }}>
            <iframe
              title="BaderTube Player"
              src={embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>

          <div className="text-lg font-semibold">{current.title}</div>
          <div className="text-sm text-white/70">{current.author} • {current.views} {t('baderTubeViews')}</div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="text-xs px-3 py-1 rounded-full bg-white/10">{t('baderTubeLikes')}: {details?.likes || '-'}</div>
            <div className="text-xs px-3 py-1 rounded-full bg-white/10">{t('baderTubeDislikes')}: {details?.dislikes || '-'}</div>
            <button onClick={copyLink} className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition">{t('baderTubeCopyLink')}</button>
            <button onClick={() => setShowDescription(v => !v)} className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition">
              {showDescription ? t('baderTubeHideDescription') : t('baderTubeShowDescription')}
            </button>
            <button onClick={() => setDownloadOpen(true)} className="text-xs px-3 py-1 rounded-full bg-emerald-500/30 hover:bg-emerald-500/45 transition">
              {t('baderTubeDownloadVideo')}
            </button>
            {copied && <div className="text-xs text-emerald-300">{t('baderTubeLinkCopied')}</div>}
          </div>

          {showDescription && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-sm font-semibold mb-2">{t('baderTubeDescription')}</div>
              <pre className="whitespace-pre-wrap break-words text-sm text-white/80 font-sans">{details?.description || '-'}</pre>
            </div>
          )}
        </AnimatedCard>
      )}

      {downloadOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">{t('baderTubeDownloadTitle')}</div>
              <button onClick={() => setDownloadOpen(false)} className="text-sm px-3 py-1 rounded-full bg-white/10 hover:bg-white/20">{t('baderTubeClose')}</button>
            </div>

            {downloads.length === 0 ? (
              <div className="text-sm text-white/80 mb-4">{t('baderTubeNoDownloadOptions')}</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-auto mb-4">
                {downloads.map(opt => (
                  <label key={`${opt.quality}-${opt.container}`} className="flex items-center justify-between gap-4 border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/5">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="download-quality"
                        checked={selectedQuality === opt.quality}
                        onChange={() => setSelectedQuality(opt.quality)}
                      />
                      <div className="text-sm">{opt.quality}</div>
                    </div>
                    <div className="text-xs text-white/65">{opt.container} • {opt.mimeType}</div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDownloadOpen(false)} className="text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">{t('baderTubeClose')}</button>
              <button
                onClick={downloadSelected}
                disabled={downloads.length === 0}
                className="text-sm px-4 py-2 rounded-lg bg-emerald-500/40 hover:bg-emerald-500/55 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('baderTubeDownloadNow')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <AnimatedCard className="p-4">
          <div className="text-sm font-semibold mb-3">{query.trim() ? t('baderTubeExplore') : t('openBaderTube')}</div>
          {loading ? (
            <div className="text-sm opacity-80">{t('baderTubeLoading')}</div>
          ) : videos.length === 0 ? (
            <div className="text-sm opacity-80">{t('baderTubeNoResults')}</div>
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
              {videos.map(v => (
                <button
                  key={`search-${v.id}`}
                  onClick={() => selectVideo(v)}
                  className="w-full text-left rounded-lg border border-white/10 hover:border-white/30 transition p-2 bg-white/5"
                >
                  <div className="flex gap-3">
                    <img src={v.thumbnail} alt={v.title} className="w-36 h-20 object-cover rounded" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium line-clamp-2">{v.title}</div>
                      <div className="text-xs opacity-70 mt-1">{v.author}</div>
                      <div className="text-xs opacity-60 mt-1">{v.views} {t('baderTubeViews')} • {v.duration}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </AnimatedCard>
      </div>
    </div>
  )
}
