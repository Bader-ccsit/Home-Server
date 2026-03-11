import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
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
  uploaderUsername: string
}

export default function Al3abiManageGame() {
  const { t, lang } = useI18n()
  const { id } = useParams()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'

  const [game, setGame] = useState<GameItem | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [consoles, setConsoles] = useState<ConsoleItem[]>([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [mode, setMode] = useState<'retro' | 'family'>('retro')
  const [consoleKey, setConsoleKey] = useState('')
  const [romFile, setRomFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)

  function authHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function load() {
    setLoading(true)
    try {
      const [gameRes, categoriesRes, consolesRes] = await Promise.all([
        axios.get(`${apiBase}/al3abi/game/${encodeURIComponent(id || '')}`, { headers: authHeaders() }),
        axios.get(`${apiBase}/al3abi/categories`),
        axios.get(`${apiBase}/al3abi/consoles`),
      ])

      const g = gameRes.data as GameItem
      setGame(g)
      setTitle(g.title || '')
      setDescription(g.description || '')
      setSelectedCategories(Array.isArray(g.categories) ? g.categories : [])
      setMode(g.mode === 'family' ? 'family' : 'retro')
      setConsoleKey(g.consoleKey || '')
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : [])
      setConsoles(Array.isArray(consolesRes.data) ? consolesRes.data : [])
    } catch {
      setGame(null)
      setCategories([])
      setConsoles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  function toggleCategory(c: string) {
    setSelectedCategories(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))
  }

  async function saveChanges() {
    if (!title.trim()) return alert(t('al3abiNameRequired'))
    if (selectedCategories.length === 0) return alert(t('al3abiCategoryRequired'))
    if (mode === 'retro' && !consoleKey) return alert(t('al3abiConsoleRequired'))

    try {
      const fd = new FormData()
      fd.append('title', title.trim())
      fd.append('description', description)
      fd.append('categories', JSON.stringify(selectedCategories))
      fd.append('mode', mode)
      fd.append('consoleKey', mode === 'retro' ? consoleKey : '')
      if (romFile) fd.append('rom', romFile)
      if (coverFile) fd.append('cover', coverFile)

      await axios.patch(`${apiBase}/al3abi/manage/game/${encodeURIComponent(id || '')}`, fd, { headers: authHeaders() })
      setRomFile(null)
      setCoverFile(null)
      await load()
      alert(t('al3abiChangesSaved'))
    } catch (err: any) {
      alert(err?.response?.data?.message || t('al3abiSaveFailed'))
    }
  }

  async function deleteGame() {
    if (!confirm(t('al3abiDeleteConfirm'))) return
    try {
      await axios.delete(`${apiBase}/al3abi/manage/game/${encodeURIComponent(id || '')}`, { headers: authHeaders() })
      window.location.href = '/al3abi/manage'
    } catch {
      alert(t('al3abiDeleteFailed'))
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex gap-2">
        <AnimatedButton onClick={() => (window.location.href = '/al3abi/manage')}>{t('al3abiBackManage')}</AnimatedButton>
        {game && <AnimatedButton onClick={() => (window.location.href = `/al3abi/game/${encodeURIComponent(game.id)}`)}>{t('al3abiOpenGame')}</AnimatedButton>}
      </div>

      {loading ? (
        <AnimatedCard className="p-6">{t('al3abiLoading')}</AnimatedCard>
      ) : !game ? (
        <AnimatedCard className="p-6">{t('al3abiNoGames')}</AnimatedCard>
      ) : (
        <AnimatedCard className="p-5">
          <div className="text-lg font-semibold mb-2">{t('al3abiManageSingle')}</div>
          <div className="text-xs opacity-70 mb-4">{t('aflamiUploader')}: {game.uploaderUsername}</div>

          <div className="mb-4">
            <FancyInput label={t('al3abiGameName')} value={title} onChange={(e: any) => setTitle(e.target.value)} />
          </div>

          <div className="mb-4">
            <label className="text-sm font-semibold block mb-2">{t('al3abiDescription')}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 2000))} rows={4} className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 outline-none" />
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
              <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="mode" checked={mode === 'retro'} onChange={() => setMode('retro')} /> {t('al3abiRetroTitle')}</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="mode" checked={mode === 'family'} onChange={() => setMode('family')} /> {t('al3abiFamilyTitle')}</label>
            </div>
          </div>

          {mode === 'retro' && (
            <div className="mb-4">
              <label className="text-sm font-semibold block mb-2">{t('al3abiConsole')}</label>
              <select value={consoleKey} onChange={e => setConsoleKey(e.target.value)} className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 outline-none">
                <option value="">{t('al3abiSelectConsole')}</option>
                {consoles.map(c => (
                  <option key={c.key} value={c.key}>{lang === 'ar' ? c.nameAr : c.nameEn}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="font-semibold block mb-1">{t('al3abiReplaceRom')}</span>
              <input type="file" onChange={e => setRomFile(e.target.files?.[0] || null)} />
            </label>
            <label className="text-sm">
              <span className="font-semibold block mb-1">{t('al3abiReplaceCover')}</span>
              <input type="file" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <AnimatedButton onClick={saveChanges}>{t('al3abiSaveChanges')}</AnimatedButton>
            <button type="button" onClick={deleteGame} className="px-4 py-2 rounded-xl bg-rose-600/70 hover:bg-rose-600 text-white">{t('driveDelete')}</button>
          </div>
        </AnimatedCard>
      )}
    </div>
  )
}
