import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import AnimatedCard from '../components/AnimatedCard'
import { useI18n } from '../contexts/I18nContext'

type VisibilityMode = 'public' | 'private'

type PasteEntry = {
  id: string
  visibility: VisibilityMode
  text: string
  fileOriginalName: string | null
  fileMime: string | null
  fileSizeBytes: number | null
  fileExpiresAt: string | null
  textExpiresAt: string
  createdAt: string
  previewUrl: string | null
  downloadUrl: string | null
}

type LatestResponse = {
  visibility: VisibilityMode
  latestText: PasteEntry | null
  latestFile: PasteEntry | null
  textTtlMinutes: number
  fileTtlMinutes: number
}

function formatBytes(size: number | null) {
  if (!size || size <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = size
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

export default function PasteMe() {
  const { t, lang } = useI18n()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'

  const [mode, setMode] = useState<VisibilityMode>('public')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [latest, setLatest] = useState<LatestResponse | null>(null)
  const [loadingLatest, setLoadingLatest] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyMode, setHistoryMode] = useState<VisibilityMode>('public')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [history, setHistory] = useState<Record<VisibilityMode, PasteEntry[]>>({ public: [], private: [] })

  function authHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function loadLatest(targetMode = mode) {
    setLoadingLatest(true)
    try {
      const res = await axios.get(`${apiBase}/pasteme/latest`, {
        params: { visibility: targetMode },
        headers: authHeaders(),
      })
      setLatest(res.data || null)
    } catch {
      setLatest(null)
    } finally {
      setLoadingLatest(false)
    }
  }

  async function loadHistory(targetMode: VisibilityMode) {
    setHistoryLoading(true)
    try {
      const res = await axios.get(`${apiBase}/pasteme/history`, {
        params: { visibility: targetMode, limit: 100 },
        headers: authHeaders(),
      })
      setHistory(prev => ({ ...prev, [targetMode]: Array.isArray(res.data) ? res.data : [] }))
    } catch {
      setHistory(prev => ({ ...prev, [targetMode]: [] }))
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadLatest(mode)
  }, [mode])

  async function submit() {
    if (saving) return
    if (!text.trim() && !file) {
      alert(t('pastemeNeedTextOrFile'))
      return
    }

    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('visibility', mode)
      fd.append('text', text.slice(0, 2000))
      if (file) fd.append('file', file)

      await axios.post(`${apiBase}/pasteme/entry`, fd, { headers: authHeaders() })
      setText('')
      setFile(null)
      await loadLatest(mode)
      if (historyOpen) await loadHistory(historyMode)
    } catch (err: any) {
      alert(err?.response?.data?.message || t('pastemeSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      alert(t('pastemeCopied'))
    } catch {
      alert(t('pastemeCopyFailed'))
    }
  }

  async function pasteFromClipboard() {
    try {
      const clipText = await navigator.clipboard.readText()
      if (!clipText) {
        alert(t('pastemeClipboardEmpty'))
        return
      }
      setText(clipText.slice(0, 2000))
    } catch {
      alert(t('pastemePasteFailed'))
    }
  }

  const currentHistory = useMemo(() => history[historyMode] || [], [history, historyMode])

  return (
    <div className="p-6">
      <AnimatedCard className="p-6 mb-5">
        <h1 className="text-2xl font-bold mb-2">{t('pastemeTitle')}</h1>
        <p className="text-sm opacity-80">{t('pastemeSubtitle')}</p>
      </AnimatedCard>

      <AnimatedCard className="p-5 mb-5">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('public')}
            className={`px-4 py-2 rounded-xl border ${mode === 'public' ? 'bg-sky-500/25 border-sky-300/50' : 'bg-white/10 border-white/20'}`}
          >
            {t('pastemePublic')}
          </button>
          <button
            type="button"
            onClick={() => setMode('private')}
            className={`px-4 py-2 rounded-xl border ${mode === 'private' ? 'bg-emerald-500/25 border-emerald-300/50' : 'bg-white/10 border-white/20'}`}
          >
            {t('pastemePrivate')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start mb-3">
          <div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, 2000))}
              rows={8}
              placeholder={t('pastemeInputPlaceholder')}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 outline-none"
            />
            <div className="text-xs opacity-70 mt-1">{text.length}/2000</div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={pasteFromClipboard}
              className="h-12 px-5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 font-semibold"
            >
              {saving ? t('pastemeSaving') : `📋 ${t('pastemePasteNow')}`}
            </button>

            <button
              type="button"
              onClick={submit}
              className="h-12 px-5 rounded-xl border border-emerald-300/40 bg-emerald-500/20 hover:bg-emerald-500/30 font-semibold"
            >
              {saving ? t('pastemeSaving') : t('pastemeGo')}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-3">
          <label className="text-sm font-semibold block mb-2">{t('pastemeUploadFile')}</label>
          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
          {file ? <div className="mt-2 text-xs opacity-90">{file.name} ({formatBytes(file.size)})</div> : null}
          <div className="text-xs opacity-70 mt-2">{t('pastemeFileTtlHint')}</div>
        </div>
      </AnimatedCard>

      <AnimatedCard className="p-5 mb-5">
        <div className="text-lg font-semibold mb-3">{t('pastemeOutput')}</div>
        {loadingLatest ? (
          <div className="text-sm opacity-80">{t('pastemeLoading')}</div>
        ) : !latest ? (
          <div className="text-sm opacity-80">{t('pastemeNoData')}</div>
        ) : (
          <>
            <div className="mb-4">
              <div className="text-sm font-semibold mb-2">{t('pastemeLatestText')}</div>
              <div className="rounded-xl border border-white/15 bg-black/20 p-3 min-h-[110px] whitespace-pre-wrap break-words">
                {latest.latestText?.text ? latest.latestText.text : t('pastemeNoTextYet')}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  disabled={!latest.latestText?.text}
                  onClick={() => latest.latestText?.text && copyValue(latest.latestText.text)}
                  className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 disabled:opacity-40"
                >
                  {t('pastemeCopy')}
                </button>
                <span className="text-xs opacity-70">{t('pastemeTextTtlHint')}</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">{t('pastemeLatestFile')}</div>
              {!latest.latestFile?.downloadUrl ? (
                <div className="text-sm opacity-80">{t('pastemeNoFileYet')}</div>
              ) : (
                <div className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <div className="font-medium mb-1 break-all">{latest.latestFile.fileOriginalName}</div>
                  <div className="text-xs opacity-80 mb-2">
                    {latest.latestFile.fileMime || 'application/octet-stream'} | {formatBytes(latest.latestFile.fileSizeBytes)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`${apiBase}${latest.latestFile.previewUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg border border-sky-300/35 bg-sky-500/15 hover:bg-sky-500/25"
                    >
                      {t('pastemePreview')}
                    </a>
                    <a
                      href={`${apiBase}${latest.latestFile.downloadUrl}`}
                      className="px-3 py-1.5 rounded-lg border border-emerald-300/35 bg-emerald-500/15 hover:bg-emerald-500/25"
                    >
                      {t('pastemeDownload')}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </AnimatedCard>

      <AnimatedCard className="p-5">
        <button
          type="button"
          onClick={async () => {
            const next = !historyOpen
            setHistoryOpen(next)
            if (next) await loadHistory(historyMode)
          }}
          className="px-4 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20"
        >
          {t('pastemeHistory')}
        </button>

        {historyOpen ? (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setHistoryMode('public')
                  loadHistory('public')
                }}
                className={`px-3 py-1.5 rounded-lg border ${historyMode === 'public' ? 'bg-sky-500/25 border-sky-300/45' : 'bg-white/10 border-white/20'}`}
              >
                {t('pastemePublicHistory')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setHistoryMode('private')
                  loadHistory('private')
                }}
                className={`px-3 py-1.5 rounded-lg border ${historyMode === 'private' ? 'bg-emerald-500/25 border-emerald-300/45' : 'bg-white/10 border-white/20'}`}
              >
                {t('pastemePrivateHistory')}
              </button>
            </div>

            {historyLoading ? (
              <div className="text-sm opacity-80">{t('pastemeLoading')}</div>
            ) : currentHistory.length === 0 ? (
              <div className="text-sm opacity-80">{t('pastemeNoHistory')}</div>
            ) : (
              <div className="space-y-3">
                {currentHistory.map(item => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs opacity-70 mb-1">{new Date(item.createdAt).toLocaleString(lang === 'ar' ? 'ar' : 'en')}</div>
                    {item.text ? (
                      <div className="text-sm whitespace-pre-wrap break-words mb-2">{item.text}</div>
                    ) : (
                      <div className="text-sm opacity-70 mb-2">{t('pastemeNoTextInEntry')}</div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {item.text ? (
                        <button onClick={() => copyValue(item.text)} className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/10">
                          {t('pastemeCopy')}
                        </button>
                      ) : null}
                      {item.previewUrl ? (
                        <a href={`${apiBase}${item.previewUrl}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg border border-sky-300/35 bg-sky-500/15">
                          {t('pastemePreview')}
                        </a>
                      ) : null}
                      {item.downloadUrl ? (
                        <a href={`${apiBase}${item.downloadUrl}`} className="px-3 py-1.5 rounded-lg border border-emerald-300/35 bg-emerald-500/15">
                          {t('pastemeDownload')}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </AnimatedCard>
    </div>
  )
}
