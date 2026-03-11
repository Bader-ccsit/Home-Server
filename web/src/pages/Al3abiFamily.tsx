import React, { useEffect, useState } from 'react'
import axios from 'axios'
import AnimatedCard from '../components/AnimatedCard'
import FancyInput from '../components/FancyInput'
import { useI18n } from '../contexts/I18nContext'

type GameItem = {
  id: string
  title: string
  description: string
  categories: string[]
  mode: 'retro' | 'family'
  coverUrl: string | null
}

type FeaturedGame = {
  id: string
  titleEn: string
  titleAr: string
  descriptionEn: string
  descriptionAr: string
  categoriesEn: string[]
  categoriesAr: string[]
  slug: string
  badge: string
}

const featuredFamilyGames: FeaturedGame[] = [
  {
    id: 'featured-ttt',
    titleEn: 'Tic Tac Toe',
    titleAr: 'إكس أو',
    descriptionEn: 'Simple and timeless head-to-head board game for all ages.',
    descriptionAr: 'لعبة كلاسيكية سريعة وممتعة لشخصين من جميع الأعمار.',
    categoriesEn: ['Board', 'Casual', 'Family'],
    categoriesAr: ['لوحية', 'خفيفة', 'عائلية'],
    slug: 'tic-tac-toe',
    badge: 'Classic',
  },
  {
    id: 'featured-memory-match',
    titleEn: 'Memory Match',
    titleAr: 'مطابقة الذاكرة',
    descriptionEn: 'Flip cards and match symbols with fewer moves to win.',
    descriptionAr: 'اقلب البطاقات وطابق الرموز بأقل عدد حركات للفوز.',
    categoriesEn: ['Memory', 'Kids', 'Family'],
    categoriesAr: ['ذاكرة', 'أطفال', 'عائلية'],
    slug: 'memory-match',
    badge: 'Memory',
  },
  {
    id: 'featured-snake',
    titleEn: 'Snake Game',
    titleAr: 'لعبة الثعبان',
    descriptionEn: 'Classic snake action playable with keyboard arrows.',
    descriptionAr: 'أسلوب الثعبان الكلاسيكي باستخدام أسهم لوحة المفاتيح.',
    categoriesEn: ['Arcade', 'Classic', 'Family'],
    categoriesAr: ['أركيد', 'كلاسيكية', 'عائلية'],
    slug: 'snake',
    badge: 'Snake',
  },
  {
    id: 'featured-hangman',
    titleEn: 'Hangman',
    titleAr: 'الرجل المشنوق',
    descriptionEn: 'Guess letters, solve the word, and save the round.',
    descriptionAr: 'خمّن الحروف واكشف الكلمة قبل نفاد المحاولات.',
    categoriesEn: ['Word', 'Puzzle', 'Family'],
    categoriesAr: ['كلمات', 'ألغاز', 'عائلية'],
    slug: 'hangman',
    badge: 'Word',
  },
  {
    id: 'featured-platformer',
    titleEn: 'Platformer',
    titleAr: 'لعبة منصات',
    descriptionEn: 'Jump over obstacles in a mini endless runner.',
    descriptionAr: 'اقفز فوق العوائق في لعبة جري ممتعة.',
    categoriesEn: ['Action', 'Platformer', 'Family'],
    categoriesAr: ['أكشن', 'منصات', 'عائلية'],
    slug: 'platformer',
    badge: 'Jump',
  },
  {
    id: 'featured-scramble',
    titleEn: 'Scramble',
    titleAr: 'سكرامبل الكلمات',
    descriptionEn: 'Unscramble words quickly and boost language skills while playing.',
    descriptionAr: 'رتّب الحروف بسرعة وطور مهاراتك اللغوية أثناء اللعب.',
    categoriesEn: ['Quiz', 'Educational', 'Family'],
    categoriesAr: ['اختبارات', 'تعليمي', 'عائلية'],
    slug: 'scramble',
    badge: 'Learning',
  },
]

export default function Al3abiFamily() {
  const { t, lang } = useI18n()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'
  const [games, setGames] = useState<GameItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [featured] = useState<FeaturedGame[]>(featuredFamilyGames)

  function authHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function loadGames(q = '') {
    setLoading(true)
    try {
      const res = await axios.get(`${apiBase}/al3abi/games`, { params: { mode: 'family', q }, headers: authHeaders() })
      setGames(Array.isArray(res.data) ? res.data : [])
    } catch {
      setGames([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGames('')
  }, [])

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => (window.location.href = '/al3abi')} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20">{t('al3abiBackHome')}</button>
        <button type="button" onClick={() => (window.location.href = '/al3abi/manage')} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20">{t('al3abiOpenManage')}</button>
      </div>

      <AnimatedCard className="p-5 mb-5 relative overflow-hidden">
        <div className="absolute -top-20 -left-14 w-52 h-52 rounded-full bg-sky-500/15 blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -right-10 w-56 h-56 rounded-full bg-emerald-500/15 blur-3xl animate-pulse" />
        <h1 className="text-2xl font-bold mb-2 relative z-10">{t('al3abiFamilyTitle')}</h1>
        <p className="text-sm opacity-75 mb-2 relative z-10">{lang === 'ar' ? 'ألعاب عائلية محلية تعمل مباشرة على خادمك.' : 'Local family games running directly on your server.'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 relative z-10">
          <FancyInput
            label={t('driveSearch')}
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
            placeholder={t('al3abiSearchGames')}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter') loadGames(query)
            }}
          />
          <button type="button" onClick={() => loadGames(query)} className="h-11 mt-6 sm:mt-0 px-4 rounded-xl border border-sky-300/35 bg-sky-500/15 hover:bg-sky-500/25">{t('driveSearch')}</button>
        </div>
      </AnimatedCard>

      <AnimatedCard className="p-5 mb-5">
        <div className="text-lg font-semibold mb-3">{lang === 'ar' ? 'ألعاب عائلية مميزة' : 'Featured Family Games'}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {featured.map(game => (
            <button
              key={game.id}
              type="button"
              onClick={() => (window.location.href = `/al3abi/family/local/${encodeURIComponent(game.slug)}`)}
              className="text-left rounded-xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-2.5 hover:border-white/30 block transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-500/20"
            >
              <div className="w-full aspect-[16/10] rounded-lg overflow-hidden bg-gradient-to-br from-indigo-500/30 via-emerald-500/20 to-sky-500/25 mb-2 border border-white/10 flex items-center justify-center">
                <span className="text-2xl font-black tracking-wide opacity-90">{game.badge}</span>
              </div>
              <div className="font-semibold text-sm mb-1 line-clamp-2">{lang === 'ar' ? game.titleAr : game.titleEn}</div>
              <div className="text-xs opacity-80 line-clamp-2 mb-2">{lang === 'ar' ? game.descriptionAr : game.descriptionEn}</div>
              <div className="flex flex-wrap gap-2">
                {(lang === 'ar' ? game.categoriesAr : game.categoriesEn).map(c => (
                  <span key={`${game.id}-${c}`} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15">{c}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </AnimatedCard>

      <AnimatedCard className="p-5">
        <div className="text-lg font-semibold mb-3">{t('al3abiManageExisting')}</div>
        {loading ? (
          <div className="text-sm opacity-80">{t('al3abiLoading')}</div>
        ) : games.length === 0 ? (
          <div className="text-sm opacity-80">{t('al3abiNoGames')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map(game => (
              <button
                key={game.id}
                type="button"
                onClick={() => (window.location.href = `/al3abi/game/${encodeURIComponent(game.id)}`)}
                className="text-left rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/30"
              >
                <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-black mb-3">
                  {game.coverUrl ? <img src={`${apiBase}${game.coverUrl}`} alt={game.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-70">{t('al3abiNoCover')}</div>}
                </div>
                <div className="font-semibold mb-1 line-clamp-2">{game.title}</div>
                <div className="text-sm opacity-80 line-clamp-2 mb-2">{game.description || t('al3abiNoDescription')}</div>
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
  )
}
