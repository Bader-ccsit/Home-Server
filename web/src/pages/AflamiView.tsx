import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
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

export default function AflamiView() {
  const { t } = useI18n()
  const { id } = useParams()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'
  const [movie, setMovie] = useState<LibraryMovie | null>(null)
  const [movies, setMovies] = useState<LibraryMovie[]>([])
  const [loading, setLoading] = useState(true)

  function makeAuthHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function load() {
    setLoading(true)
    try {
      const [movieRes, moviesRes] = await Promise.all([
        axios.get(`${apiBase}/aflami/movie/${encodeURIComponent(id || '')}`, { headers: makeAuthHeaders() }),
        axios.get(`${apiBase}/aflami/movies`, { headers: makeAuthHeaders() }),
      ])
      setMovie(movieRes.data || null)
      setMovies(Array.isArray(moviesRes.data) ? moviesRes.data : [])
    } catch {
      setMovie(null)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const suggested = useMemo(() => {
    if (!movie) return []
    const currentCategories = new Set(movie.categories || [])
    return movies
      .filter(m => m.id !== movie.id)
      .filter(m => (m.categories || []).some(c => currentCategories.has(c)))
      .slice(0, 3)
  }, [movie, movies])

  return (
    <div className="p-6">
      <div className="mb-4 flex gap-2">
        <AnimatedButton onClick={() => (window.location.href = '/aflami')}>{t('aflamiBackToList')}</AnimatedButton>
        <AnimatedButton onClick={() => (window.location.href = '/aflami/manage')}>{t('aflamiOpenManage')}</AnimatedButton>
      </div>

      {loading ? (
        <AnimatedCard className="p-6">{t('aflamiLoading')}</AnimatedCard>
      ) : !movie ? (
        <AnimatedCard className="p-6">{t('aflamiNoResults')}</AnimatedCard>
      ) : (
        <>
          <AnimatedCard className="p-5 mb-5">
            <h1 className="text-2xl font-bold mb-3">{movie.title}</h1>
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black mb-4">
              <video controls className="w-full" src={`${apiBase}${movie.movieUrl}`} />
            </div>

            <div className="text-sm opacity-80 mb-2">{t('aflamiUploader')}: {movie.uploaderUsername}</div>
            {movie.hasArabicTranslation && <div className="text-sm text-emerald-300 mb-2">{t('aflamiHasArabicTranslation')}</div>}

            <div className="mb-3">
              {movie.thumbnailUrl && (
                <div className="mb-3 flex justify-center">
                  <img
                    src={`${apiBase}${movie.thumbnailUrl}`}
                    alt={movie.title}
                    className="w-full max-w-[220px] aspect-[2/3] object-cover rounded-xl border border-white/10"
                  />
                </div>
              )}
              <div className="text-sm font-semibold mb-2">{t('aflamiDescription')}</div>
              <p className="text-sm opacity-85 whitespace-pre-wrap">{movie.description || t('aflamiNoDescription')}</p>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">{t('aflamiCategory')}</div>
              <div className="flex flex-wrap gap-2">
                {(movie.categories || []).map(c => (
                  <span key={c} className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/15">{c}</span>
                ))}
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-5">
            <div className="text-lg font-semibold mb-3">{t('aflamiSuggestedMovies')}</div>
            {suggested.length === 0 ? (
              <div className="text-sm opacity-80">{t('aflamiNoSuggestedMovies')}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggested.map(s => (
                  <button
                    key={s.id}
                    onClick={() => (window.location.href = `/aflami/${encodeURIComponent(s.id)}`)}
                    className="text-left rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/30"
                  >
                    {s.thumbnailUrl ? (
                      <img
                        src={`${apiBase}${s.thumbnailUrl}`}
                        alt={s.title}
                        className="w-full aspect-[2/3] object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <video
                        src={`${apiBase}${s.movieUrl}`}
                        className="w-full aspect-[2/3] object-cover rounded-lg mb-3 bg-black"
                        muted
                        preload="metadata"
                      />
                    )}
                    <div className="font-semibold mb-1 line-clamp-2">{s.title}</div>
                    <div className="text-xs opacity-70">{s.categories.join(', ')}</div>
                  </button>
                ))}
              </div>
            )}
          </AnimatedCard>
        </>
      )}
    </div>
  )
}
