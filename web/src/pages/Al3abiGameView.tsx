import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import AnimatedCard from '../components/AnimatedCard'
import { useI18n } from '../contexts/I18nContext'

type GameItem = {
  id: string
  title: string
  description: string
  categories: string[]
  mode: 'retro' | 'family'
  consoleKey: string | null
  consoleNameEn: string | null
  consoleNameAr: string | null
  emulatorCore: string | null
  romUrl: string
  coverUrl: string | null
}

function buildEmulatorDoc(gameUrl: string, core: string) {
  const safeUrl = JSON.stringify(gameUrl)
  const safeCore = JSON.stringify(core)

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; background: #000; height: 100%; }
      #game { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script>
      window.EJS_player = '#game';
      window.EJS_core = ${safeCore};
      window.EJS_gameUrl = ${safeUrl};
      window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
    </script>
    <script src="https://cdn.emulatorjs.org/stable/data/loader.js"></script>
  </body>
</html>`
}

export default function Al3abiGameView() {
  const { t, lang } = useI18n()
  const { id } = useParams()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'
  const [game, setGame] = useState<GameItem | null>(null)
  const [loading, setLoading] = useState(true)

  function authHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function load() {
    setLoading(true)
    try {
      const res = await axios.get(`${apiBase}/al3abi/game/${encodeURIComponent(id || '')}`, { headers: authHeaders() })
      setGame(res.data || null)
    } catch {
      setGame(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const frameDoc = useMemo(() => {
    if (!game || !game.emulatorCore) return ''
    return buildEmulatorDoc(`${apiBase}${game.romUrl}`, game.emulatorCore)
  }, [game, apiBase])

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => (window.location.href = '/al3abi')} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20">{t('al3abiBackHome')}</button>
        <button type="button" onClick={() => (window.location.href = '/al3abi/manage')} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20">{t('al3abiOpenManage')}</button>
      </div>

      {loading ? (
        <AnimatedCard className="p-6">{t('al3abiLoading')}</AnimatedCard>
      ) : !game ? (
        <AnimatedCard className="p-6">{t('al3abiNoGames')}</AnimatedCard>
      ) : (
        <AnimatedCard className="p-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold">{game.title}</h1>
            {game.coverUrl ? (
              <img src={`${apiBase}${game.coverUrl}`} alt={game.title} className="w-32 h-44 object-cover rounded-xl border border-white/10" />
            ) : null}
          </div>

          <div className="rounded-xl overflow-hidden border border-white/10 bg-black mb-4" style={{ minHeight: 420 }}>
            {game.emulatorCore ? (
              <iframe title={game.title} srcDoc={frameDoc} allowFullScreen className="w-full h-[65vh] min-h-[420px] border-0" />
            ) : (
              <div className="h-[420px] flex flex-col items-center justify-center gap-3">
                <div className="text-sm opacity-80">{t('al3abiNoPlayableCore')}</div>
                <a
                  href={`${apiBase}${game.romUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl border border-sky-300/35 bg-sky-500/15 hover:bg-sky-500/25"
                >
                  {t('al3abiDownloadRom')}
                </a>
              </div>
            )}
          </div>

          <div className="space-y-3 text-sm">
            <div><span className="font-semibold">{t('al3abiConsole')}:</span> {lang === 'ar' ? (game.consoleNameAr || t('al3abiFamilyTitle')) : (game.consoleNameEn || t('al3abiFamilyTitle'))}</div>
            <div><span className="font-semibold">{t('al3abiDescription')}:</span> {game.description || t('al3abiNoDescription')}</div>
            <div className="flex flex-wrap gap-2">
              <span className="font-semibold">{t('al3abiCategory')}:</span>
              {(game.categories || []).map(c => (
                <span key={c} className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/15">{c}</span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      )}
    </div>
  )
}
