import React, { useEffect, useMemo, useRef, useState } from 'react'
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

const MOVIE_EXTENSIONS = ['.mp4', '.m4v', '.mov', '.webm']
const THUMB_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

function extensionOf(name: string) {
  const i = name.lastIndexOf('.')
  if (i < 0) return ''
  return name.slice(i).toLowerCase()
}

function nameWithoutExtension(name: string) {
  const i = name.lastIndexOf('.')
  if (i < 0) return name
  return name.slice(0, i)
}

function fileAllowed(file: File, allowed: string[]) {
  return allowed.includes(extensionOf(file.name))
}

export default function AflamiManage() {
  const { t } = useI18n()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'

  const [movies, setMovies] = useState<LibraryMovie[]>([])
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [existingSearch, setExistingSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [movieFile, setMovieFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [hasArabicTranslation, setHasArabicTranslation] = useState(false)

  const movieInputRef = useRef<HTMLInputElement | null>(null)
  const thumbInputRef = useRef<HTMLInputElement | null>(null)

  function makeAuthHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function load() {
    setLoading(true)
    try {
      const [moviesRes, categoriesRes] = await Promise.all([
        axios.get(`${apiBase}/aflami/movies`, { headers: makeAuthHeaders() }),
        axios.get(`${apiBase}/aflami/categories`),
      ])

      const list: LibraryMovie[] = Array.isArray(moviesRes.data) ? moviesRes.data : []
      setMovies(list)
      setAllCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredExistingMovies = existingSearch.trim()
    ? movies.filter(m => String(m.title || '').toLowerCase().includes(existingSearch.trim().toLowerCase()))
    : movies

  const descriptionCount = useMemo(() => description.length, [description])

  function setMovieFromFile(file: File) {
    if (!fileAllowed(file, MOVIE_EXTENSIONS)) {
      alert(t('aflamiInvalidMovieFormat'))
      return
    }
    setMovieFile(file)
    if (!title.trim()) {
      setTitle(nameWithoutExtension(file.name))
    }
  }

  function setThumbnailFromFile(file: File) {
    if (!fileAllowed(file, THUMB_EXTENSIONS)) {
      alert(t('aflamiInvalidThumbnailFormat'))
      return
    }
    setThumbnailFile(file)
  }

  function onMovieInput(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setMovieFromFile(file)
  }

  function onThumbInput(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setThumbnailFromFile(file)
  }

  function toggleCategory(c: string) {
    setCategories(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))
  }

  async function submitCreate() {
    if (!movieFile) {
      alert(t('aflamiMovieFileRequired'))
      return
    }
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

    const fd = new FormData()
    fd.append('movie', movieFile)
    if (thumbnailFile) fd.append('thumbnail', thumbnailFile)
    fd.append('title', title.trim())
    fd.append('description', description)
    fd.append('categories', JSON.stringify(categories))
    fd.append('hasArabicTranslation', String(hasArabicTranslation))

    setSaving(true)
    try {
      await axios.post(`${apiBase}/aflami/movie`, fd, {
        headers: makeAuthHeaders(),
      })

      setMovieFile(null)
      setThumbnailFile(null)
      setTitle('')
      setDescription('')
      setCategories([])
      setHasArabicTranslation(false)

      if (movieInputRef.current) movieInputRef.current.value = ''
      if (thumbInputRef.current) thumbInputRef.current.value = ''

      await load()
    } catch (err: any) {
      alert(err?.response?.data?.message || t('aflamiSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">{t('aflamiManageTitle')}</h1>
          <p className="text-sm text-white/75">{t('aflamiManageSubtitle')}</p>
        </div>
        <AnimatedButton onClick={() => (window.location.href = '/aflami')}>{t('aflamiBackToList')}</AnimatedButton>
      </div>

      <AnimatedCard className="p-5 mb-6">
        <div className="text-lg font-semibold mb-4">{t('aflamiUploadNewMovie')}</div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div
            className="rounded-xl border border-dashed border-white/25 bg-white/5 p-4"
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file) setMovieFromFile(file)
            }}
          >
            <div className="text-sm font-semibold mb-2">{t('aflamiMovieFile')}</div>
            <div className="text-xs opacity-75 mb-3">{t('aflamiMovieFileHint')}</div>
            <input ref={movieInputRef} type="file" accept={MOVIE_EXTENSIONS.join(',')} onChange={e => onMovieInput(e.target.files)} />
            {movieFile && <div className="mt-2 text-xs text-emerald-300">{movieFile.name}</div>}
          </div>

          <div
            className="rounded-xl border border-dashed border-white/25 bg-white/5 p-4"
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file) setThumbnailFromFile(file)
            }}
          >
            <div className="text-sm font-semibold mb-2">{t('aflamiThumbnailOptional')}</div>
            <div className="text-xs opacity-75 mb-3">{t('aflamiThumbnailHint')}</div>
            <input ref={thumbInputRef} type="file" accept={THUMB_EXTENSIONS.join(',')} onChange={e => onThumbInput(e.target.files)} />
            {thumbnailFile && <div className="mt-2 text-xs text-emerald-300">{thumbnailFile.name}</div>}
          </div>
        </div>

        <div className="mb-4">
          <FancyInput label={t('aflamiMovieName')} value={title} onChange={(e: any) => setTitle(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="text-sm font-semibold block mb-2">{t('aflamiDescription')}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, 1500))}
            rows={4}
            className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 outline-none"
          />
          <div className="text-xs opacity-70 mt-1">{descriptionCount}/1500</div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-semibold block mb-2">{t('aflamiCategory')}</label>
          <div className="flex flex-wrap gap-2">
            {allCategories.map(c => (
              <button
                type="button"
                key={c}
                onClick={() => toggleCategory(c)}
                className={`px-3 py-1 rounded-full text-xs border ${categories.includes(c) ? 'bg-emerald-500/30 border-emerald-400' : 'bg-white/10 border-white/15'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" checked={hasArabicTranslation} onChange={e => setHasArabicTranslation(e.target.checked)} />
          {t('aflamiHasArabicTranslation')}
        </label>

        <div>
          <AnimatedButton onClick={submitCreate}>{saving ? t('aflamiSaving') : t('aflamiSaveMovie')}</AnimatedButton>
        </div>
      </AnimatedCard>

      <AnimatedCard className="p-5">
        <div className="text-lg font-semibold mb-4">{t('aflamiManageExisting')}</div>
        <div className="mb-4">
          <FancyInput
            label={t('driveSearch')}
            value={existingSearch}
            onChange={(e: any) => setExistingSearch(e.target.value)}
            placeholder={t('aflamiSearchPlaceholder')}
          />
        </div>
        {loading ? (
          <div className="text-sm opacity-80">{t('aflamiLoading')}</div>
        ) : filteredExistingMovies.length === 0 ? (
          <div className="text-sm opacity-80">{t('aflamiNoResults')}</div>
        ) : (
          <div className="space-y-2">
            {filteredExistingMovies.map(movie => (
              <button
                key={movie.id}
                onClick={() => (window.location.href = `/aflami/manage/${encodeURIComponent(movie.id)}`)}
                className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/30"
              >
                <div className="font-semibold">{movie.title}</div>
              </button>
            ))}
          </div>
        )}
      </AnimatedCard>
    </div>
  )
}
