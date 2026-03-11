import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import AnimatedCard from '../components/AnimatedCard'
import FancyInput from '../components/FancyInput'
import { useI18n } from '../contexts/I18nContext'

type ConsoleItem = { key: string; nameEn: string; nameAr: string; emulatorCore: string }
type GameItem = {
  id: string
  title: string
  description: string
  categories: string[]
  mode: 'retro' | 'family'
  consoleKey: string | null
  consoleNameEn: string | null
  consoleNameAr: string | null
  coverUrl: string | null
}

export default function Al3abiRetro() {
  const { t, lang } = useI18n()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'
  const [consoles, setConsoles] = useState<ConsoleItem[]>([])
  const [games, setGames] = useState<GameItem[]>([])
  const [selectedConsole, setSelectedConsole] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  function authHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function loadGames(q = query, consoleKey = selectedConsole) {
    setLoading(true)
    try {
      const [consolesRes, gamesRes] = await Promise.all([
        axios.get(`${apiBase}/al3abi/consoles`),
        axios.get(`${apiBase}/al3abi/games`, {
          params: { mode: 'retro', q, consoleKey: consoleKey || undefined },
          headers: authHeaders(),
        }),
      ])

      setConsoles(Array.isArray(consolesRes.data) ? consolesRes.data : [])
      setGames(Array.isArray(gamesRes.data) ? gamesRes.data : [])
    } catch {
      setGames([])
      setConsoles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGames('', '')
  }, [])

  const sortedConsoles = useMemo(() => consoles.slice(), [consoles])

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => (window.location.href = '/al3abi')} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20">{t('al3abiBackHome')}</button>
        <button type="button" onClick={() => (window.location.href = '/al3abi/manage')} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20">{t('al3abiOpenManage')}</button>
      </div>

      <AnimatedCard className="p-5 mb-5">
        <h1 className="text-2xl font-bold mb-2">{t('al3abiRetroTitle')}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <FancyInput
            label={t('driveSearch')}
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
            placeholder={t('al3abiSearchGames')}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter') loadGames(query, selectedConsole)
            }}
          />
          <button type="button" onClick={() => loadGames(query, selectedConsole)} className="h-11 mt-6 sm:mt-0 px-4 rounded-xl border border-sky-300/35 bg-sky-500/15 hover:bg-sky-500/25">{t('driveSearch')}</button>
        </div>
      </AnimatedCard>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <AnimatedCard className="p-4 h-fit">
          <div className="font-semibold mb-3">{t('al3abiConsoles')}</div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setSelectedConsole('')
                loadGames(query, '')
              }}
              className={`w-full text-left rounded-lg px-3 py-2 border ${selectedConsole === '' ? 'bg-emerald-500/25 border-emerald-400/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
            >
              {t('al3abiAllConsoles')}
            </button>
            {sortedConsoles.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  setSelectedConsole(c.key)
                  loadGames(query, c.key)
                }}
                className={`w-full text-left rounded-lg px-3 py-2 border ${selectedConsole === c.key ? 'bg-emerald-500/25 border-emerald-400/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
              >
                {lang === 'ar' ? c.nameAr : c.nameEn}
              </button>
            ))}
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-5">
          {loading ? (
            <div className="text-sm opacity-80">{t('al3abiLoading')}</div>
          ) : games.length === 0 ? (
            <div className="text-sm opacity-80">{t('al3abiNoGames')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {games.map(game => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => (window.location.href = `/al3abi/game/${encodeURIComponent(game.id)}`)}
                  className="text-left rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/30"
                >
                  <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-black/60 mb-3 flex items-center justify-center">
                    {game.coverUrl ? <img src={`${apiBase}${game.coverUrl}`} alt={game.title} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-70">{t('al3abiNoCover')}</div>}
                  </div>
                  <div className="font-semibold mb-1 line-clamp-2">{game.title}</div>
                  <div className="text-xs opacity-70 mb-2">{lang === 'ar' ? game.consoleNameAr : game.consoleNameEn}</div>
                  <div className="flex flex-wrap gap-2">
                    {(game.categories || []).map(c => (
                      <span key={`${game.id}-${c}`} className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/15">{c}</span>
                    ))}
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
