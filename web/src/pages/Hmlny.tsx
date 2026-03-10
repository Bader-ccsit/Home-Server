import React, { useState } from 'react'
import axios from 'axios'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import FancyInput from '../components/FancyInput'
import { useI18n } from '../contexts/I18nContext'

type MediaItem = {
  id: string
  type: 'video' | 'image'
  mediaUrl: string
  downloadUrl: string
  width?: number
  height?: number
  durationSeconds?: number
}

type ResultBlock = {
  blockId: string
  sourceUrl: string
  platform: string
  title: string
  items: MediaItem[]
  activeIndex: number
}

export default function Hmlny() {
  const { t } = useI18n()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'

  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [blocks, setBlocks] = useState<ResultBlock[]>([])

  function authHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function pasteUrl() {
    try {
      const text = await navigator.clipboard.readText()
      if (text?.trim()) setUrl(text.trim())
    } catch {
      setError(t('hmlnyPasteFailed'))
    }
  }

  async function searchUrl(e: React.FormEvent) {
    e.preventDefault()
    const clean = url.trim()
    if (!clean) return

    setLoading(true)
    setError('')
    try {
      const res = await axios.post(
        `${apiBase}/7mlny/extract`,
        { url: clean },
        { headers: authHeaders() },
      )

      const items = Array.isArray(res?.data?.items) ? res.data.items : []
      if (!items.length) {
        setError(t('hmlnyNoMediaFound'))
      } else {
        const block: ResultBlock = {
          blockId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sourceUrl: clean,
          platform: String(res?.data?.platform || t('hmlnyUnknownPlatform')),
          title: String(res?.data?.title || t('hmlnyUntitled')),
          items,
          activeIndex: 0,
        }
        setBlocks(prev => [block, ...prev])
      }
      setUrl('')
    } catch (err: any) {
      setError(err?.response?.data?.message || t('hmlnyExtractFailed'))
    } finally {
      setLoading(false)
    }
  }

  function setActive(blockId: string, idx: number) {
    setBlocks(prev => prev.map(b => (b.blockId === blockId ? { ...b, activeIndex: idx } : b)))
  }

  function stepActive(block: ResultBlock, delta: number) {
    const next = (block.activeIndex + delta + block.items.length) % block.items.length
    setActive(block.blockId, next)
  }

  function downloadCurrent(block: ResultBlock) {
    const item = block.items[block.activeIndex]
    if (!item) return
    const a = document.createElement('a')
    a.href = item.downloadUrl
    a.download = ''
    a.rel = 'noreferrer'
    a.click()
  }

  function downloadAll(block: ResultBlock) {
    block.items.forEach((item, i) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = item.downloadUrl
        a.download = ''
        a.rel = 'noreferrer'
        a.click()
      }, i * 250)
    })
  }

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
      <AnimatedCard className="!max-w-none !mx-0 p-5 sm:p-6">
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">{t('hmlnyTitle')}</h1>
          <p className="text-sm opacity-75 mt-1">{t('hmlnySubtitle')}</p>
        </div>

        <form onSubmit={searchUrl} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div>
            <FancyInput
              label={t('hmlnyUrlInput')}
              value={url}
              onChange={(e: any) => setUrl(e.target.value)}
              placeholder={t('hmlnyUrlPlaceholder')}
            />
          </div>
          <button
            type="button"
            onClick={pasteUrl}
            className="h-[46px] w-[46px] inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10"
            title={t('hmlnyPaste')}
            aria-label={t('hmlnyPaste')}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3h8v4H8z" />
              <path d="M7 7h10a2 2 0 0 1 2 2v11H5V9a2 2 0 0 1 2-2z" />
              <path d="M9 12h6" />
              <path d="M9 16h6" />
            </svg>
          </button>
          <AnimatedButton type="submit" className="h-[46px] px-6" disabled={loading || !url.trim()}>
            {loading ? t('hmlnySearching') : t('hmlnySearch')}
          </AnimatedButton>
        </form>

        {error && <div className="mt-3 text-rose-400 text-sm">{error}</div>}
      </AnimatedCard>

      <div className="space-y-4">
        {blocks.map(block => {
          const item = block.items[block.activeIndex]
          return (
            <AnimatedCard key={block.blockId} className="!max-w-none !mx-0 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs px-2 py-1 rounded-full border border-sky-300/35 bg-sky-300/10 text-sky-200">{block.platform}</span>
                <div className="text-sm opacity-70 truncate">{block.sourceUrl}</div>
              </div>

              <h2 className="text-xl font-semibold mb-3">{block.title}</h2>

              <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden mb-4 min-h-[220px] flex items-center justify-center">
                {item?.type === 'video' ? (
                  <video controls src={item.mediaUrl} className="w-full max-h-[460px] object-contain bg-black" />
                ) : (
                  <img src={item?.mediaUrl} alt={block.title} className="w-full max-h-[460px] object-contain bg-black" />
                )}
              </div>

              {block.items.length > 1 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => stepActive(block, -1)}
                      className="px-3 py-1 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-sm"
                    >
                      {t('hmlnyPrev')}
                    </button>

                    {block.items.map((m, idx) => (
                      <button
                        key={m.id + idx}
                        type="button"
                        onClick={() => setActive(block.blockId, idx)}
                        className={`h-8 min-w-8 px-2 rounded-full text-xs border ${idx === block.activeIndex ? 'border-sky-300 bg-sky-400/20' : 'border-white/15 bg-white/5'}`}
                        title={`${t('hmlnyItem')} ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => stepActive(block, 1)}
                      className="px-3 py-1 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-sm"
                    >
                      {t('hmlnyNext')}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <AnimatedButton onClick={() => downloadCurrent(block)}>{t('hmlnyDownload')}</AnimatedButton>
                {block.items.length > 1 && (
                  <AnimatedButton onClick={() => downloadAll(block)} className="bg-white/10">
                    {t('hmlnyDownloadAll')}
                  </AnimatedButton>
                )}
              </div>
            </AnimatedCard>
          )
        })}

        {blocks.length === 0 && (
          <AnimatedCard className="!max-w-none !mx-0 p-6 text-sm opacity-75">
            {t('hmlnyNoResultsYet')}
          </AnimatedCard>
        )}
      </div>
    </div>
  )
}
