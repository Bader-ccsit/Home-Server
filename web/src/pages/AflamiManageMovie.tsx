import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import FancyInput from '../components/FancyInput'
import { useI18n } from '../contexts/I18nContext'

type LibraryMovie = {
  id: string
  title: string
  description: string
  categories: string[]
  hasArabicTranslation: boolean
  uploaderUsername: string
  movieUrl: string
  thumbnailUrl: string | null
}

export default function AflamiManageMovie() {
  const { t } = useI18n()
  const { id } = useParams()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'

  const [movie, setMovie] = useState<LibraryMovie | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [hasArabicTranslation, setHasArabicTranslation] = useState(false)

  function makeAuthHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function load() {
    setLoading(true)
    try {
      const [movieRes, categoriesRes] = await Promise.all([
        axios.get(`${apiBase}/aflami/movie/${encodeURIComponent(id || '')}`, { headers: makeAuthHeaders() }),
        axios.get(`${apiBase}/aflami/categories`),
      ])

      const m: LibraryMovie = movieRes.data
      setMovie(m)
      setTitle(m?.title || '')
      setDescription(m?.description || '')
      setCategories(Array.isArray(m?.categories) ? m.categories : [])
      setHasArabicTranslation(!!m?.hasArabicTranslation)
      setAllCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : [])
    } catch {
      setMovie(null)
      setAllCategories([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  function toggleCategory(c: string) {
    setCategories(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))
  }

  async function saveChanges() {
    if (!title.trim()) {
      alert(t('aflamiMovieNameRequired'))
      return
    }
    if (description.length > 1500) {
      alert(t('aflamiDescriptionTooLong'))
      return
    }
    if (categories.length === 0) {
      alert(t('aflamiCategoryRequired'))
      return
    }

    try {
      await axios.patch(
        `${apiBase}/aflami/movie/${encodeURIComponent(id || '')}`,
        {
          title: title.trim(),
          description,
          categories,
          hasArabicTranslation,
        },
        { headers: makeAuthHeaders() },
      )
      await load()
      alert(t('aflamiChangesSaved'))
    } catch (err: any) {
      alert(err?.response?.data?.message || t('aflamiSaveFailed'))
    }
  }

  async function deleteMovie() {
    if (!confirm(t('aflamiDeleteConfirm'))) return
    try {
      await axios.delete(`${apiBase}/aflami/movie/${encodeURIComponent(id || '')}`, { headers: makeAuthHeaders() })
      window.location.href = '/aflami/manage'
    } catch {
      alert(t('aflamiDeleteFailed'))
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex gap-2">
        <AnimatedButton onClick={() => (window.location.href = '/aflami/manage')}>{t('aflamiBackToManage')}</AnimatedButton>
        {movie && <AnimatedButton onClick={() => (window.location.href = `/aflami/${encodeURIComponent(movie.id)}`)}>{t('aflamiOpenMovie')}</AnimatedButton>}
      </div>

      {loading ? (
        <AnimatedCard className="p-6">{t('aflamiLoading')}</AnimatedCard>
      ) : !movie ? (
        <AnimatedCard className="p-6">{t('aflamiNoResults')}</AnimatedCard>
      ) : (
        <AnimatedCard className="p-5">
          <div className="text-lg font-semibold mb-4">{t('aflamiManageSingleMovie')}</div>
          <div className="text-xs opacity-70 mb-4">{t('aflamiUploader')}: {movie.uploaderUsername}</div>

          <div className="mb-4">
            <FancyInput label={t('aflamiMovieName')} value={title} onChange={(e: any) => setTitle(e.target.value)} />
          </div>

          <div className="mb-4">
            <label className="text-sm font-semibold block mb-2">{t('aflamiDescription')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 1500))}
              rows={5}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 outline-none"
            />
            <div className="text-xs opacity-70 mt-1">{description.length}/1500</div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-semibold block mb-2">{t('aflamiCategory')}</label>
            <div className="flex flex-wrap gap-2">
              {allCategories.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={`px-3 py-1 rounded-full text-xs border ${categories.includes(c) ? 'bg-emerald-500/30 border-emerald-400' : 'bg-white/10 border-white/15'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm mb-5">
            <input type="checkbox" checked={hasArabicTranslation} onChange={e => setHasArabicTranslation(e.target.checked)} />
            {t('aflamiHasArabicTranslation')}
          </label>

          <div className="flex flex-wrap gap-2">
            <AnimatedButton onClick={saveChanges}>{t('aflamiSaveChanges')}</AnimatedButton>
            <button
              type="button"
              onClick={deleteMovie}
              className="px-4 py-2 rounded-xl bg-rose-600/70 hover:bg-rose-600 text-white"
            >
              {t('driveDelete')}
            </button>
          </div>
        </AnimatedCard>
      )}
    </div>
  )
}
