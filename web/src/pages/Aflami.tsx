import React, { useEffect, useState } from 'react'
import axios from 'axios'
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
  createdAt: string
}

export default function Aflami() {
  const { t } = useI18n()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'
  const [movies, setMovies] = useState<LibraryMovie[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  function makeAuthHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function loadMovies(q = '') {
    setLoading(true)
    try {
      const [moviesRes, categoriesRes] = await Promise.all([
        axios.get(`${apiBase}/aflami/movies`, {
          params: { q },
          headers: makeAuthHeaders(),
        }),
        axios.get(`${apiBase}/aflami/categories`),
      ])

      setMovies(Array.isArray(moviesRes.data) ? moviesRes.data : [])
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : [])
    } catch {
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMovies('')
  }, [])

  const filteredMovies = selectedCategory
    ? movies.filter(m => (m.categories || []).includes(selectedCategory))
    : movies

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">{t('aflamiTitle')}</h1>
          <p className="text-sm text-white/75">{t('aflamiLibrarySubtitle')}</p>
        </div>
        <AnimatedButton onClick={() => (window.location.href = '/aflami/manage')}>{t('aflamiOpenManage')}</AnimatedButton>
      </div>

      <AnimatedCard className="p-5 mb-6">
        <div className="flex flex-col lg:flex-row items-end gap-3">
          <div className="w-full lg:flex-1">
            <FancyInput
              label={t('driveSearch')}
              value={query}
              onChange={(e: any) => setQuery(e.target.value)}
              placeholder={t('aflamiSearchPlaceholder')}
              onKeyDown={(e: any) => {
                if (e.key === 'Enter') loadMovies(query)
              }}
            />
          </div>
          <AnimatedButton onClick={() => loadMovies(query)}>{t('driveSearch')}</AnimatedButton>
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold mb-2">{t('aflamiSearchByCategory')}</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-full text-xs border ${selectedCategory === '' ? 'bg-emerald-500/30 border-emerald-400' : 'bg-white/10 border-white/15'}`}
            >
              {t('aflamiAllCategories')}
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1 rounded-full text-xs border ${selectedCategory === c ? 'bg-emerald-500/30 border-emerald-400' : 'bg-white/10 border-white/15'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </AnimatedCard>

      <AnimatedCard className="p-5">
        {loading ? (
          <div className="text-sm opacity-80">{t('aflamiLoading')}</div>
        ) : filteredMovies.length === 0 ? (
          <div className="text-sm opacity-80">{t('aflamiNoResults')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredMovies.map(movie => (
              <button
                key={movie.id}
                onClick={() => (window.location.href = `/aflami/${encodeURIComponent(movie.id)}`)}
                className="text-left rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/30"
              >
                <div className="w-full aspect-[2/3] rounded-lg mb-3 overflow-hidden bg-black">
                  {movie.thumbnailUrl ? (
                    <img
                      src={`${apiBase}${movie.thumbnailUrl}`}
                      alt={movie.title}
                      className="w-full h-full object-cover object-top block"
                    />
                  ) : (
                    <video
                      src={`${apiBase}${movie.movieUrl}`}
                      className="w-full h-full object-cover object-top block"
                      muted
                      preload="metadata"
                    />
                  )}
                </div>

                <div className="font-semibold text-base mb-1">{movie.title}</div>
                <div className="text-xs opacity-70 mb-2">{t('aflamiUploader')}: {movie.uploaderUsername}</div>
                <p className="text-sm opacity-85 line-clamp-3 mb-3">{movie.description || t('aflamiNoDescription')}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {movie.categories.map(c => (
                    <span key={`${movie.id}-${c}`} className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/15">{c}</span>
                  ))}
                </div>
                {movie.hasArabicTranslation && (
                  <div className="text-xs text-emerald-300">{t('aflamiHasArabicTranslation')}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </AnimatedCard>
    </div>
  )
}
