import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
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
  coverUrl: string | null
}

const COVER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
const ROM_EXTENSIONS = ['.nes', '.sfc', '.smc', '.n64', '.z64', '.v64', '.gba', '.gb', '.gbc', '.bin', '.cue', '.md', '.gen', '.sms', '.gg', '.zip', '.7z', '.nds', '.iso', '.chd', '.wad', '.rom', '.a26']

function extensionOf(name: string) {
  const i = name.lastIndexOf('.')
  if (i < 0) return ''
  return name.slice(i).toLowerCase()
}

export default function Al3abiManage() {
  const { t, lang } = useI18n()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'

  const [games, setGames] = useState<GameItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [consoles, setConsoles] = useState<ConsoleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [mode, setMode] = useState<'retro' | 'family'>('retro')
  const [consoleKey, setConsoleKey] = useState('')
  const [romFile, setRomFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)

  const romInputRef = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  function authHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function load() {
    setLoading(true)
    try {
      const [gamesRes, categoriesRes, consolesRes] = await Promise.all([
        axios.get(`${apiBase}/al3abi/manage/games`, { headers: authHeaders() }),
        axios.get(`${apiBase}/al3abi/categories`),
        axios.get(`${apiBase}/al3abi/consoles`),
      ])

      setGames(Array.isArray(gamesRes.data) ? gamesRes.data : [])
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : [])
      setConsoles(Array.isArray(consolesRes.data) ? consolesRes.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredGames = useMemo(() => {
    if (!search.trim()) return games
    return games.filter(g => String(g.title || '').toLowerCase().includes(search.trim().toLowerCase()))
  }, [games, search])

  function toggleCategory(c: string) {
    setSelectedCategories(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))
  }

  function setRom(file: File) {
    if (!ROM_EXTENSIONS.includes(extensionOf(file.name))) {
      alert(t('al3abiInvalidRom'))
      return
    }
    setRomFile(file)
  }

  function setCover(file: File) {
    if (!COVER_EXTENSIONS.includes(extensionOf(file.name))) {
      alert(t('al3abiInvalidCover'))
      return
    }
    setCoverFile(file)
  }

  async function createGame() {
    if (!title.trim()) return alert(t('al3abiNameRequired'))
    if (!romFile) return alert(t('al3abiRomRequired'))
    if (selectedCategories.length === 0) return alert(t('al3abiCategoryRequired'))
    if (mode === 'retro' && !consoleKey) return alert(t('al3abiConsoleRequired'))

    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', title.trim())
      fd.append('description', description)
      fd.append('categories', JSON.stringify(selectedCategories))
      fd.append('mode', mode)
      fd.append('consoleKey', mode === 'retro' ? consoleKey : '')
      fd.append('rom', romFile)
      if (coverFile) fd.append('cover', coverFile)

      await axios.post(`${apiBase}/al3abi/manage/game`, fd, { headers: authHeaders() })

      setTitle('')
      setDescription('')
      setSelectedCategories([])
      setMode('retro')
      setConsoleKey('')
      setRomFile(null)
      setCoverFile(null)
      if (romInputRef.current) romInputRef.current.value = ''
      if (coverInputRef.current) coverInputRef.current.value = ''

      await load()
    } catch (err: any) {
      alert(err?.response?.data?.message || t('al3abiSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap gap-2">
        <AnimatedButton onClick={() => (window.location.href = '/al3abi')}>{t('al3abiBackHome')}</AnimatedButton>
      </div>

      <AnimatedCard className="p-5 mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('al3abiManageTitle')}</h1>
        <p className="text-sm opacity-75 mb-4">{t('al3abiManageSubtitle')}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl border border-dashed border-white/25 bg-white/5 p-4">
            <div className="text-sm font-semibold mb-2">{t('al3abiRomFile')}</div>
            <input ref={romInputRef} type="file" onChange={e => { const f = e.target.files?.[0]; if (f) setRom(f) }} />
            {romFile && <div className="mt-2 text-xs text-emerald-300">{romFile.name}</div>}
          </div>

          <div className="rounded-xl border border-dashed border-white/25 bg-white/5 p-4">
            <div className="text-sm font-semibold mb-2">{t('al3abiCoverFile')}</div>
            <input ref={coverInputRef} type="file" onChange={e => { const f = e.target.files?.[0]; if (f) setCover(f) }} />
            {coverFile && <div className="mt-2 text-xs text-emerald-300">{coverFile.name}</div>}
          </div>
        </div>

        <div className="mb-4">
          <FancyInput label={t('al3abiGameName')} value={title} onChange={(e: any) => setTitle(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="text-sm font-semibold block mb-2">{t('al3abiDescription')}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, 2000))}
            rows={4}
            className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-semibold block mb-2">{t('al3abiCategory')}</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={`px-3 py-1 rounded-full text-xs border ${selectedCategories.includes(c) ? 'bg-emerald-500/30 border-emerald-400' : 'bg-white/10 border-white/15'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-semibold mb-2">{t('al3abiType')}</div>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="mode" checked={mode === 'retro'} onChange={() => setMode('retro')} />
              {t('al3abiRetroTitle')}
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="mode" checked={mode === 'family'} onChange={() => setMode('family')} />
              {t('al3abiFamilyTitle')}
            </label>
          </div>
        </div>

        {mode === 'retro' && (
          <div className="mb-5">
            <label className="text-sm font-semibold block mb-2">{t('al3abiConsole')}</label>
            <select value={consoleKey} onChange={e => setConsoleKey(e.target.value)} className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 outline-none">
              <option value="">{t('al3abiSelectConsole')}</option>
              {consoles.map(c => (
                <option key={c.key} value={c.key}>{lang === 'ar' ? c.nameAr : c.nameEn}</option>
              ))}
            </select>
          </div>
        )}

        <AnimatedButton onClick={createGame}>{saving ? t('al3abiSaving') : t('al3abiSaveGame')}</AnimatedButton>
      </AnimatedCard>

      <AnimatedCard className="p-5">
        <div className="text-lg font-semibold mb-3">{t('al3abiManageExisting')}</div>
        <div className="mb-4">
          <FancyInput
            label={t('driveSearch')}
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            placeholder={t('al3abiSearchGames')}
          />
        </div>

        {loading ? (
          <div className="text-sm opacity-80">{t('al3abiLoading')}</div>
        ) : filteredGames.length === 0 ? (
          <div className="text-sm opacity-80">{t('al3abiNoGames')}</div>
        ) : (
          <div className="space-y-2">
            {filteredGames.map(game => (
              <button
                key={game.id}
                type="button"
                onClick={() => (window.location.href = `/al3abi/manage/${encodeURIComponent(game.id)}`)}
                className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/30"
              >
                <div className="font-semibold">{game.title}</div>
              </button>
            ))}
          </div>
        )}
      </AnimatedCard>
    </div>
  )
}
