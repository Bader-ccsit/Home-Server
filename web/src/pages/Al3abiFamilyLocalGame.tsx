import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import AnimatedCard from '../components/AnimatedCard'
import { useI18n } from '../contexts/I18nContext'
import hangmanEnglishRaw from '../data/hangman-english.txt?raw'
import hangmanArabicRaw from '../data/hangman-arabic.txt?raw'
import scrambleEnglishRaw from '../data/scramble-english.txt?raw'
import scrambleArabicRaw from '../data/scramble-arabic.txt?raw'

type ResultTone = 'win' | 'lose' | 'draw'

type ResultState = {
  open: boolean
  tone: ResultTone
  title: string
  message: string
}

type WordEntry = {
  word: string
  hintEn: string
  hintAr: string
}

function randOf<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  return arr.slice().sort(() => Math.random() - 0.5)
}

function normalizeWord(w: string) {
  return w.replace(/[^A-Za-z\u0600-\u06FF]/g, '').trim()
}

function generateWordPool(lang: string, minCount = 560): WordEntry[] {
  if (lang === 'ar') {
    const categories = [
      { en: 'Nature', ar: 'طبيعة', stems: ['نهر', 'جبل', 'بحر', 'شجر', 'غيم', 'مطر', 'رمل', 'وادي', 'صحر', 'سهل', 'قمر', 'شمس', 'ثلج', 'ندى', 'ورق', 'ريح'] },
      { en: 'Food', ar: 'طعام', stems: ['تفاح', 'موز', 'تمر', 'عنب', 'خبز', 'سكر', 'ملح', 'شورب', 'فطور', 'عشاء', 'حليب', 'جبن', 'رز', 'لحم', 'دجاج', 'فلفل'] },
      { en: 'Home', ar: 'منزل', stems: ['بيت', 'غرف', 'نافذ', 'باب', 'مطبخ', 'حمام', 'كنب', 'طاوله', 'سرير', 'وساد', 'مصباح', 'حديقه', 'سطح', 'ممر', 'سجاده', 'خزانه'] },
      { en: 'School', ar: 'تعليم', stems: ['مدرس', 'طالب', 'درس', 'كتاب', 'قلم', 'ممحا', 'دفتر', 'سبور', 'مكتب', 'جامعه', 'معلم', 'حساب', 'قراءه', 'كتابه', 'امتحان', 'فصل'] },
      { en: 'Travel', ar: 'سفر', stems: ['سفر', 'رحله', 'مطار', 'سياره', 'قطار', 'طريق', 'خريطه', 'جواز', 'حقيبه', 'فندق', 'ميناء', 'دراجه', 'جسر', 'تذكره', 'محطه', 'مقعد'] },
      { en: 'Sports', ar: 'رياضة', stems: ['كرة', 'ملعب', 'سباق', 'هداف', 'حارس', 'فريق', 'مباراه', 'مدرب', 'بطوله', 'تمرين', 'جري', 'قفز', 'سباحه', 'دوري', 'كاس', 'نشاط'] },
      { en: 'Animals', ar: 'حيوانات', stems: ['حصان', 'ارنب', 'دب', 'نمر', 'اسد', 'فيل', 'طائر', 'سمك', 'قط', 'كلب', 'ذئب', 'ثعلب', 'غزال', 'ديك', 'حمام', 'بطه'] },
      { en: 'Tech', ar: 'تقنية', stems: ['حاسوب', 'شاشه', 'هاتف', 'لوحه', 'سماعه', 'برمج', 'انترنت', 'شبكه', 'تطبيق', 'بيانات', 'نظام', 'معالج', 'ذاكره', 'شحن', 'كاميرا', 'مؤشر'] },
      { en: 'City', ar: 'مدينة', stems: ['شارع', 'سوق', 'مقهى', 'مستشف', 'متحف', 'مكتبه', 'مركز', 'برج', 'محل', 'حديقه', 'رصيف', 'حي', 'دوار', 'جراج', 'محكمه', 'بلديه'] },
      { en: 'Time', ar: 'وقت', stems: ['صباح', 'مساء', 'ليل', 'نهار', 'دقيقه', 'ساعه', 'شهر', 'سنه', 'امس', 'غد', 'موعد', 'تقويم', 'لحظه', 'فتره', 'اسبوع', 'موسم'] },
    ]

    const prefixes = ['', 'ال', 'ب', 'م', 'س']
    const suffixes = ['', 'ة', 'ي', 'ات', 'ون', 'ه']

    const out: WordEntry[] = []
    for (const c of categories) {
      for (const stem of c.stems) {
        for (const pre of prefixes) {
          for (const suf of suffixes) {
            const w = normalizeWord(`${pre}${stem}${suf}`)
            if (w.length < 3 || w.length > 12) continue
            out.push({ word: w, hintEn: c.en, hintAr: c.ar })
            if (out.length >= minCount + 160) break
          }
          if (out.length >= minCount + 160) break
        }
        if (out.length >= minCount + 160) break
      }
      if (out.length >= minCount + 160) break
    }

    const uniq = new Map<string, WordEntry>()
    for (const e of out) {
      if (!uniq.has(e.word)) uniq.set(e.word, e)
      if (uniq.size >= minCount) break
    }
    return Array.from(uniq.values())
  }

  const categories = [
    { en: 'Nature', ar: 'طبيعة', stems: ['river', 'forest', 'desert', 'mountain', 'ocean', 'valley', 'cloud', 'rain', 'thunder', 'meadow', 'island', 'breeze', 'sunset', 'moonlight', 'wildflower', 'waterfall'] },
    { en: 'Food', ar: 'طعام', stems: ['apple', 'banana', 'carrot', 'pepper', 'cookie', 'sandwich', 'pasta', 'noodle', 'cheese', 'butter', 'honey', 'cinnamon', 'vanilla', 'coffee', 'kitchen', 'dessert'] },
    { en: 'Home', ar: 'منزل', stems: ['window', 'doorway', 'bedroom', 'kitchen', 'garden', 'cushion', 'blanket', 'lamp', 'closet', 'hallway', 'balcony', 'garage', 'shelf', 'curtain', 'carpet', 'pillow'] },
    { en: 'School', ar: 'تعليم', stems: ['school', 'teacher', 'student', 'library', 'notebook', 'pencil', 'science', 'history', 'grammar', 'algebra', 'lesson', 'project', 'campus', 'exam', 'subject', 'reading'] },
    { en: 'Travel', ar: 'سفر', stems: ['airport', 'station', 'highway', 'journey', 'passport', 'ticket', 'suitcase', 'compass', 'voyage', 'harbor', 'bridge', 'roadtrip', 'backpack', 'terminal', 'vehicle', 'avenue'] },
    { en: 'Sports', ar: 'رياضة', stems: ['soccer', 'tennis', 'cricket', 'racing', 'athlete', 'stadium', 'trainer', 'workout', 'victory', 'trophy', 'marathon', 'sprinter', 'defender', 'captain', 'league', 'fitness'] },
    { en: 'Animals', ar: 'حيوانات', stems: ['tiger', 'panda', 'rabbit', 'falcon', 'dolphin', 'eagle', 'wolf', 'zebra', 'giraffe', 'hamster', 'kitten', 'puppy', 'beaver', 'otter', 'parrot', 'kangaroo'] },
    { en: 'Technology', ar: 'تقنية', stems: ['browser', 'network', 'server', 'database', 'monitor', 'keyboard', 'software', 'hardware', 'battery', 'charger', 'camera', 'display', 'pixel', 'internet', 'coding', 'router'] },
    { en: 'City', ar: 'مدينة', stems: ['market', 'museum', 'village', 'square', 'traffic', 'subway', 'station', 'theater', 'hospital', 'library', 'parkway', 'sidewalk', 'avenue', 'district', 'courthouse', 'mall'] },
    { en: 'Time', ar: 'وقت', stems: ['morning', 'evening', 'midnight', 'weekend', 'calendar', 'minute', 'second', 'hourglass', 'timeline', 'season', 'holiday', 'springtime', 'sunrise', 'sunset', 'yesterday', 'tomorrow'] },
  ]

  const prefixes = ['', 'sun', 'sky', 'mega', 'micro', 'hyper', 'eco', 'neo']
  const suffixes = ['', 'ly', 'er', 'ing', 'ness', 'able', 'zone', 'field']

  const out: WordEntry[] = []
  for (const c of categories) {
    for (const stem of c.stems) {
      for (const pre of prefixes) {
        for (const suf of suffixes) {
          const w = normalizeWord(`${pre}${stem}${suf}`.toLowerCase())
          if (w.length < 4 || w.length > 14) continue
          out.push({ word: w, hintEn: c.en, hintAr: c.ar })
          if (out.length >= minCount + 220) break
        }
        if (out.length >= minCount + 220) break
      }
      if (out.length >= minCount + 220) break
    }
    if (out.length >= minCount + 220) break
  }

  const uniq = new Map<string, WordEntry>()
  for (const e of out) {
    if (!uniq.has(e.word)) uniq.set(e.word, e)
    if (uniq.size >= minCount) break
  }
  return Array.from(uniq.values())
}

function parseHangmanWordList(raw: string, lang: 'en' | 'ar'): WordEntry[] {
  const lines = String(raw || '')
    .split(/\r?\n/)
    .map(v => v.trim())
    .filter(Boolean)

  const out: WordEntry[] = []
  for (const line of lines) {
    const withoutIndex = line.replace(/^\d+\.\s*/, '')
    const sep = withoutIndex.indexOf(' - ')
    if (sep <= 0) continue

    const rawWord = withoutIndex.slice(0, sep).trim()
    const rawHint = withoutIndex.slice(sep + 3).trim()
    const cleanWord = normalizeWord(rawWord)
    if (!cleanWord || !rawHint) continue

    out.push({
      word: lang === 'en' ? cleanWord.toLowerCase() : cleanWord,
      hintEn: lang === 'en' ? rawHint : 'General',
      hintAr: lang === 'ar' ? rawHint : 'عام',
    })
  }

  return out
}

const HANGMAN_POOL_EN = parseHangmanWordList(hangmanEnglishRaw, 'en')
const HANGMAN_POOL_AR = parseHangmanWordList(hangmanArabicRaw, 'ar')
const SCRAMBLE_POOL_EN = parseHangmanWordList(scrambleEnglishRaw, 'en')
const SCRAMBLE_POOL_AR = parseHangmanWordList(scrambleArabicRaw, 'ar')

function ResultModal({ state, onClose, onRestart, lang }: { state: ResultState; onClose: () => void; onRestart: () => void; lang: string }) {
  if (!state.open) return null
  const toneClass =
    state.tone === 'win'
      ? 'border-emerald-300/35 bg-emerald-950/70'
      : state.tone === 'lose'
      ? 'border-rose-300/35 bg-rose-950/70'
      : 'border-amber-300/35 bg-amber-950/70'

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-2xl border ${toneClass} shadow-2xl p-5 animate-[fadeIn_.2s_ease]`}>
        <h2 className="text-2xl font-black mb-2">{state.title}</h2>
        <p className="text-sm opacity-90 mb-5">{state.message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/15">
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
          <button onClick={onRestart} className="px-4 py-2 rounded-full border border-sky-300/40 bg-sky-500/20 hover:bg-sky-500/30">
            {lang === 'ar' ? 'إعادة اللعب' : 'Play Again'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TicTacToeGame({ lang }: { lang: string }) {
  const [board, setBoard] = useState<string[]>(Array(9).fill(''))
  const [turn, setTurn] = useState<'X' | 'O'>('X')
  const [result, setResult] = useState<ResultState>({ open: false, tone: 'draw', title: '', message: '' })

  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6],
    [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
  ]

  function reset() {
    setBoard(Array(9).fill(''))
    setTurn('X')
    setResult({ open: false, tone: 'draw', title: '', message: '' })
  }

  function play(i: number) {
    if (board[i] || result.open) return
    const next = [...board]
    next[i] = turn
    setBoard(next)

    const hit = lines.find(([a, b, c]) => next[a] && next[a] === next[b] && next[a] === next[c])
    if (hit) {
      setResult({
        open: true,
        tone: 'win',
        title: lang === 'ar' ? 'انتهت الجولة' : 'Round Complete',
        message: lang === 'ar' ? `الفائز هو اللاعب ${turn}` : `Player ${turn} won the game.`,
      })
      return
    }

    if (next.every(Boolean)) {
      setResult({
        open: true,
        tone: 'draw',
        title: lang === 'ar' ? 'تعادل' : 'Draw',
        message: lang === 'ar' ? 'لا يوجد فائز في هذه الجولة.' : 'No winner this round.',
      })
      return
    }

    setTurn(turn === 'X' ? 'O' : 'X')
  }

  return (
    <div>
      <div className="mb-3 text-sm opacity-80">{lang === 'ar' ? `الدور: ${turn}` : `Turn: ${turn}`}</div>
      <div className="grid grid-cols-3 gap-2 max-w-sm">
        {board.map((v, i) => (
          <button key={i} onClick={() => play(i)} className="h-24 rounded-xl border border-white/15 bg-white/5 text-3xl font-black transition-transform hover:scale-[1.03]">
            {v}
          </button>
        ))}
      </div>
      <button onClick={reset} className="mt-3 px-4 py-2 rounded-xl border border-white/20 bg-white/10">{lang === 'ar' ? 'إعادة' : 'Reset'}</button>
      <ResultModal state={result} onClose={() => setResult(prev => ({ ...prev, open: false }))} onRestart={reset} lang={lang} />
    </div>
  )
}

function WordScrambleGame({ lang }: { lang: string }) {
  const pool = useMemo(() => {
    const source = lang === 'ar' ? SCRAMBLE_POOL_AR : SCRAMBLE_POOL_EN
    if (source.length > 0) {
      return source
        .map(v => ({
          word: lang === 'en' ? normalizeWord(v.word).toLowerCase() : normalizeWord(v.word),
          hintEn: v.hintEn,
          hintAr: v.hintAr,
        }))
        .filter(v => v.word.length >= 3)
    }

    return generateWordPool(lang, 560)
      .map(v => ({ ...v, word: normalizeWord(v.word) }))
      .filter(v => v.word.length >= 3)
  }, [lang])

  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [entry, setEntry] = useState<WordEntry>(pool[0])
  const [scramble, setScramble] = useState(pool[0]?.word || '')
  const [msg, setMsg] = useState('')
  const [result, setResult] = useState<ResultState>({ open: false, tone: 'draw', title: '', message: '' })

  function mixWord(w: string) {
    const arr = w.split('')
    let out = shuffle(arr).join('')
    let guard = 0
    while (out === w && guard < 12) {
      out = shuffle(arr).join('')
      guard += 1
    }
    return out
  }

  function pickNext() {
    const next = randOf(pool)
    setEntry(next)
    setScramble(mixWord(next.word))
    setAnswer('')
  }

  function restart() {
    setScore(0)
    setLives(3)
    setMsg('')
    setResult({ open: false, tone: 'draw', title: '', message: '' })
    pickNext()
  }

  useEffect(() => {
    if (pool.length) {
      const first = randOf(pool)
      setEntry(first)
      setScramble(mixWord(first.word))
      setAnswer('')
      setScore(0)
      setLives(3)
      setResult({ open: false, tone: 'draw', title: '', message: '' })
    }
  }, [lang, pool.length])

  function submit() {
    if (result.open) return
    const normalizedAnswer = lang === 'en' ? normalizeWord(answer).toLowerCase() : normalizeWord(answer)
    if (normalizedAnswer === entry.word) {
      const newScore = score + 1
      setScore(newScore)
      setMsg(lang === 'ar' ? 'إجابة صحيحة!' : 'Correct!')
      if (newScore >= 10) {
        setResult({
          open: true,
          tone: 'win',
          title: lang === 'ar' ? 'فوز رائع!' : 'Great Win!',
          message: lang === 'ar' ? 'حققت 10 نقاط في لعبة سكرامبل.' : 'You reached 10 points in Scramble.',
        })
        return
      }
      setTimeout(() => {
        setMsg('')
        pickNext()
      }, 380)
      return
    }

    const nextLives = lives - 1
    setLives(nextLives)
    setMsg(lang === 'ar' ? `خطأ. تلميح: ${entry.hintAr}` : `Wrong. Hint: ${entry.hintEn}`)
    if (nextLives <= 0) {
      setResult({
        open: true,
        tone: 'lose',
        title: lang === 'ar' ? 'انتهت المحاولات' : 'Out of Lives',
        message: lang === 'ar' ? `الكلمة كانت: ${entry.word}` : `The word was: ${entry.word}`,
      })
    } else {
      setTimeout(() => {
        pickNext()
      }, 420)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-2 text-sm opacity-80">{lang === 'ar' ? 'التصنيف' : 'Category'}: {lang === 'ar' ? entry.hintAr : entry.hintEn}</div>
      <div className="text-4xl font-black tracking-widest mb-3">{scramble}</div>
      <div className="flex gap-2 mb-2">
        <input value={answer} onChange={e => setAnswer(e.target.value)} className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2" placeholder={lang === 'ar' ? 'اكتب الإجابة' : 'Your answer'} onKeyDown={e => { if (e.key === 'Enter') submit() }} />
        <button onClick={submit} className="px-4 py-2 rounded-xl border border-white/20 bg-white/10">{lang === 'ar' ? 'تحقق' : 'Check'}</button>
      </div>
      <div className="text-sm opacity-80">{lang === 'ar' ? 'النقاط' : 'Score'}: {score} | {lang === 'ar' ? 'المحاولات' : 'Lives'}: {lives}</div>
      {msg && <div className="text-sm mt-1 text-emerald-300">{msg}</div>}
      <ResultModal state={result} onClose={() => setResult(prev => ({ ...prev, open: false }))} onRestart={restart} lang={lang} />
    </div>
  )
}

function MemoryMatchGame({ lang }: { lang: string }) {
  const iconPool = ['🍎', '⚽', '🚗', '🎮', '🚀', '🐼', '🦊', '🍇', '🏀', '🎲', '🚲', '🍩', '🐬', '🌙', '⭐', '🧩', '🦋', '🌈', '🍓', '🎯', '🐢', '🌵']
  const [mode, setMode] = useState<'normal' | 'large' | 'xlarge'>('normal')
  const [deck, setDeck] = useState<string[]>([])
  const [open, setOpen] = useState<number[]>([])
  const [solved, setSolved] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [timeLeft, setTimeLeft] = useState(120)
  const [result, setResult] = useState<ResultState>({ open: false, tone: 'draw', title: '', message: '' })

  const modeConfig = useMemo(() => {
    if (mode === 'large') return { pairs: 10, cols: 5, time: 160 }
    if (mode === 'xlarge') return { pairs: 14, cols: 7, time: 220 }
    return { pairs: 6, cols: 4, time: 120 }
  }, [mode])

  function restart(nextMode = mode) {
    const cfg = nextMode === 'large' ? { pairs: 10, cols: 5, time: 160 } : nextMode === 'xlarge' ? { pairs: 14, cols: 7, time: 220 } : { pairs: 6, cols: 4, time: 120 }
    const icons = shuffle(iconPool).slice(0, cfg.pairs)
    setDeck(shuffle([...icons, ...icons]))
    setOpen([])
    setSolved([])
    setMoves(0)
    setTimeLeft(cfg.time)
    setResult({ open: false, tone: 'draw', title: '', message: '' })
  }

  useEffect(() => {
    restart(mode)
  }, [mode])

  useEffect(() => {
    if (open.length !== 2 || result.open) return
    const [a, b] = open
    if (deck[a] === deck[b]) {
      setSolved(prev => [...prev, a, b])
      setOpen([])
      setMoves(v => v + 1)
      return
    }
    const t = setTimeout(() => {
      setOpen([])
      setMoves(v => v + 1)
    }, 650)
    return () => clearTimeout(t)
  }, [open, deck, result.open])

  useEffect(() => {
    if (result.open) return
    if (deck.length > 0 && solved.length === deck.length) {
      setResult({
        open: true,
        tone: 'win',
        title: lang === 'ar' ? 'أحسنت!' : 'Excellent!',
        message: lang === 'ar' ? `أنهيت اللعبة في ${moves} حركة.` : `You completed the board in ${moves} moves.`,
      })
    }
  }, [solved.length, deck.length, moves, lang, result.open])

  useEffect(() => {
    if (result.open) return
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setResult({
            open: true,
            tone: 'lose',
            title: lang === 'ar' ? 'انتهى الوقت' : 'Time Up',
            message: lang === 'ar' ? 'انتهى الوقت قبل إنهاء جميع البطاقات.' : 'You ran out of time before finishing all pairs.',
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [result.open, lang])

  const cols = modeConfig.cols

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <button onClick={() => setMode('normal')} className={`px-3 py-1 rounded-full border ${mode === 'normal' ? 'bg-emerald-500/25 border-emerald-300/50' : 'bg-white/10 border-white/20'}`}>{lang === 'ar' ? 'الحجم العادي' : 'Normal'}</button>
        <button onClick={() => setMode('large')} className={`px-3 py-1 rounded-full border ${mode === 'large' ? 'bg-emerald-500/25 border-emerald-300/50' : 'bg-white/10 border-white/20'}`}>{lang === 'ar' ? 'حجم كبير' : 'Large'}</button>
        <button onClick={() => setMode('xlarge')} className={`px-3 py-1 rounded-full border ${mode === 'xlarge' ? 'bg-emerald-500/25 border-emerald-300/50' : 'bg-white/10 border-white/20'}`}>{lang === 'ar' ? 'حجم كبير جداً' : 'Extra Large'}</button>
        <button onClick={() => restart(mode)} className="px-3 py-1 rounded-full border border-white/20 bg-white/10">{lang === 'ar' ? 'إعادة' : 'Restart'}</button>
      </div>
      <div className="mb-2 text-sm opacity-80">{lang === 'ar' ? 'الحركات' : 'Moves'}: {moves} | {lang === 'ar' ? 'الوقت' : 'Time'}: {timeLeft}s</div>
      <div className="grid gap-2 max-w-4xl" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {deck.map((v, i) => {
          const show = open.includes(i) || solved.includes(i)
          return (
            <button key={i} onClick={() => (!show && open.length < 2 && !result.open ? setOpen(prev => [...prev, i]) : null)} className="h-20 rounded-xl border border-white/15 bg-white/5 text-3xl transition-transform hover:scale-[1.03]">
              {show ? v : '❓'}
            </button>
          )
        })}
      </div>
      <ResultModal state={result} onClose={() => setResult(prev => ({ ...prev, open: false }))} onRestart={() => restart(mode)} lang={lang} />
    </div>
  )
}

function SnakeGame({ lang }: { lang: string }) {
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([{ x: 6, y: 6 }])
  const [dir, setDir] = useState<{ x: number; y: number }>({ x: 1, y: 0 })
  const [food, setFood] = useState({ x: 10, y: 8 })
  const [alive, setAlive] = useState(true)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ResultState>({ open: false, tone: 'draw', title: '', message: '' })
  const size = 16

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && dir.y !== 1) setDir({ x: 0, y: -1 })
      if (e.key === 'ArrowDown' && dir.y !== -1) setDir({ x: 0, y: 1 })
      if (e.key === 'ArrowLeft' && dir.x !== 1) setDir({ x: -1, y: 0 })
      if (e.key === 'ArrowRight' && dir.x !== -1) setDir({ x: 1, y: 0 })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dir])

  function reset() {
    setSnake([{ x: 6, y: 6 }])
    setDir({ x: 1, y: 0 })
    setFood({ x: 10, y: 8 })
    setAlive(true)
    setRunning(false)
    setResult({ open: false, tone: 'draw', title: '', message: '' })
  }

  useEffect(() => {
    if (!running || !alive || result.open) return
    const t = setInterval(() => {
      setSnake(prev => {
        const head = { x: prev[0].x + dir.x, y: prev[0].y + dir.y }
        if (head.x < 0 || head.y < 0 || head.x >= size || head.y >= size || prev.some(p => p.x === head.x && p.y === head.y)) {
          setAlive(false)
          setRunning(false)
          setResult({
            open: true,
            tone: 'lose',
            title: lang === 'ar' ? 'انتهت اللعبة' : 'Game Over',
            message: lang === 'ar' ? `اصطدمت! نتيجتك ${prev.length - 1}` : `You crashed! Score ${prev.length - 1}`,
          })
          return prev
        }

        const next = [head, ...prev]
        if (head.x === food.x && head.y === food.y) {
          setFood({ x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) })
          if (next.length - 1 >= 25) {
            setRunning(false)
            setResult({
              open: true,
              tone: 'win',
              title: lang === 'ar' ? 'فوز رائع!' : 'Amazing Win!',
              message: lang === 'ar' ? 'وصلت إلى 25 نقطة في الثعبان.' : 'You reached 25 points in Snake.',
            })
          }
          return next
        }
        next.pop()
        return next
      })
    }, 130)
    return () => clearInterval(t)
  }, [dir, food, alive, running, result.open, lang])

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm opacity-90">
        <button onClick={() => setRunning(true)} className="px-3 py-1 rounded-xl border border-emerald-300/40 bg-emerald-500/15">{lang === 'ar' ? 'ابدأ' : 'Start'}</button>
        <button onClick={() => setRunning(false)} className="px-3 py-1 rounded-xl border border-amber-300/40 bg-amber-500/15">{lang === 'ar' ? 'إيقاف مؤقت' : 'Pause'}</button>
        <button onClick={reset} className="px-3 py-1 rounded-xl border border-white/25 bg-white/10">{lang === 'ar' ? 'إعادة' : 'Reset'}</button>
      </div>
      <div className="mb-2 text-sm opacity-80">{lang === 'ar' ? 'النقاط' : 'Score'}: {snake.length - 1}</div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, 18px)`, gap: 1 }}>
        {Array.from({ length: size * size }).map((_, i) => {
          const x = i % size
          const y = Math.floor(i / size)
          const isSnake = snake.some(p => p.x === x && p.y === y)
          const isFood = food.x === x && food.y === y
          return <div key={i} style={{ width: 18, height: 18 }} className={`${isSnake ? 'bg-emerald-400' : isFood ? 'bg-rose-400' : 'bg-slate-700'} rounded-sm`} />
        })}
      </div>
      <ResultModal state={result} onClose={() => setResult(prev => ({ ...prev, open: false }))} onRestart={reset} lang={lang} />
    </div>
  )
}

function HangmanGame({ lang }: { lang: string }) {
  const pool = useMemo(() => {
    const source = lang === 'ar' ? HANGMAN_POOL_AR : HANGMAN_POOL_EN
    return source.length > 0 ? source : generateWordPool(lang, 560)
  }, [lang])
  const lettersEn = 'abcdefghijklmnopqrstuvwxyz'.split('')
  const lettersAr = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'ة']
  const letters = lang === 'ar' ? lettersAr : lettersEn

  const [entry, setEntry] = useState<WordEntry>(pool[0])
  const [guessed, setGuessed] = useState<string[]>([])
  const [result, setResult] = useState<ResultState>({ open: false, tone: 'draw', title: '', message: '' })

  function restart() {
    setEntry(randOf(pool))
    setGuessed([])
    setResult({ open: false, tone: 'draw', title: '', message: '' })
  }

  useEffect(() => {
    if (pool.length) {
      setEntry(randOf(pool))
      setGuessed([])
      setResult({ open: false, tone: 'draw', title: '', message: '' })
    }
  }, [lang, pool.length])

  const word = entry?.word || ''
  const misses = guessed.filter(l => !word.includes(l)).length
  const masked = word.split('').map(ch => (guessed.includes(ch) ? ch : '_')).join(' ')
  const won = word.split('').every(ch => guessed.includes(ch))
  const lost = misses >= 6

  useEffect(() => {
    if (result.open || !word) return
    if (won) {
      setResult({
        open: true,
        tone: 'win',
        title: lang === 'ar' ? 'أحسنت!' : 'You Won!',
        message: lang === 'ar' ? `اكتشفت الكلمة بنجاح. (${entry.hintAr})` : `You solved the word. (${entry.hintEn})`,
      })
    } else if (lost) {
      setResult({
        open: true,
        tone: 'lose',
        title: lang === 'ar' ? 'خسرت الجولة' : 'You Lost',
        message: lang === 'ar' ? `الكلمة كانت: ${word}` : `The word was: ${word}`,
      })
    }
  }, [won, lost, word, entry, result.open, lang])

  return (
    <div className="max-w-xl">
      <div className="text-sm opacity-80 mb-2">{lang === 'ar' ? 'تلميح التصنيف' : 'Category hint'}: {lang === 'ar' ? entry.hintAr : entry.hintEn}</div>
      <div className="text-3xl font-black tracking-widest mb-2">{masked}</div>
      <div className="text-sm opacity-80 mb-3">{lang === 'ar' ? 'الأخطاء' : 'Misses'}: {misses}/6</div>
      <div className="flex flex-wrap gap-1 mb-3">
        {letters.map(ch => (
          <button key={ch} disabled={guessed.includes(ch) || result.open} onClick={() => setGuessed(prev => [...prev, ch])} className="px-2 py-1 rounded border border-white/20 bg-white/10 disabled:opacity-40">
            {ch}
          </button>
        ))}
      </div>
      <button onClick={restart} className="px-4 py-2 rounded-xl border border-white/20 bg-white/10">{lang === 'ar' ? 'كلمة جديدة' : 'New Word'}</button>
      <ResultModal state={result} onClose={() => setResult(prev => ({ ...prev, open: false }))} onRestart={restart} lang={lang} />
    </div>
  )
}

function PlatformerGame({ lang }: { lang: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [seed, setSeed] = useState(0)
  const [result, setResult] = useState<ResultState>({ open: false, tone: 'draw', title: '', message: '' })

  function reset() {
    setRunning(false)
    setStarted(false)
    setSeed(v => v + 1)
    setResult({ open: false, tone: 'draw', title: '', message: '' })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const player = { x: 40, y: 0, w: 24, h: 30, vy: 0, onGround: false }
    const groundY = 196
    player.y = groundY - player.h

    let score = 0
    let alive = true
    let speed = 3.2
    let spawnTimer = 0
    const obstacles: Array<{ x: number; y: number; w: number; h: number; type: 'cactus' | 'rock' | 'bird' | 'crate' }> = []
    const clouds: Array<{ x: number; y: number; s: number }> = [
      { x: 80, y: 35, s: 1.0 },
      { x: 260, y: 50, s: 1.4 },
      { x: 420, y: 28, s: 0.8 },
    ]

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && player.onGround && running && alive) {
        player.vy = -10
        player.onGround = false
      }
      if ((e.code === 'KeyP' || e.code === 'Escape') && started) {
        setRunning(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)

    function spawnObstacle() {
      const roll = Math.random()
      if (roll < 0.25) {
        obstacles.push({ x: 820, y: groundY - 18, w: 16, h: 18, type: 'rock' })
      } else if (roll < 0.55) {
        obstacles.push({ x: 820, y: groundY - 30, w: 20, h: 30, type: 'cactus' })
      } else if (roll < 0.8) {
        obstacles.push({ x: 820, y: groundY - 22, w: 24, h: 22, type: 'crate' })
      } else {
        obstacles.push({ x: 820, y: groundY - 58, w: 28, h: 18, type: 'bird' })
      }
    }

    function hit(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    }

    let raf = 0
    let prev = performance.now()

    function loop(now: number) {
      const dt = Math.min(33, now - prev)
      prev = now

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, '#0b1220')
      gradient.addColorStop(1, '#1d3557')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (const c of clouds) {
        if (running && alive) c.x -= 0.25 * c.s
        if (c.x < -80) c.x = 860
        ctx.fillStyle = 'rgba(226,232,240,0.35)'
        ctx.beginPath()
        ctx.arc(c.x, c.y, 14 * c.s, 0, Math.PI * 2)
        ctx.arc(c.x + 16 * c.s, c.y + 2, 12 * c.s, 0, Math.PI * 2)
        ctx.arc(c.x - 12 * c.s, c.y + 3, 10 * c.s, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = '#334155'
      ctx.fillRect(0, groundY, canvas.width, 6)

      if (running && alive) {
        score += dt * 0.02
        speed = Math.min(10.5, 3.2 + score * 0.018)

        player.vy += 0.45
        player.y += player.vy
        if (player.y >= groundY - player.h) {
          player.y = groundY - player.h
          player.vy = 0
          player.onGround = true
        }

        spawnTimer -= dt
        if (spawnTimer <= 0) {
          spawnObstacle()
          spawnTimer = Math.max(420, 1300 - score * 4 + Math.random() * 380)
        }

        for (const ob of obstacles) ob.x -= speed
        while (obstacles.length && obstacles[0].x + obstacles[0].w < -30) obstacles.shift()

        for (const ob of obstacles) {
          if (hit(player, ob)) {
            alive = false
            setRunning(false)
            setResult({
              open: true,
              tone: 'lose',
              title: lang === 'ar' ? 'انتهت اللعبة' : 'Game Over',
              message: lang === 'ar' ? `اصطدمت بعائق. النتيجة: ${Math.floor(score)}` : `You hit a barrier. Score: ${Math.floor(score)}`,
            })
            break
          }
        }

        if (score >= 250) {
          alive = false
          setRunning(false)
          setResult({
            open: true,
            tone: 'win',
            title: lang === 'ar' ? 'فوز أسطوري!' : 'Epic Win!',
            message: lang === 'ar' ? 'أنهيت التحدي المتدرج بنجاح.' : 'You cleared the progressive challenge.',
          })
        }
      }

      ctx.fillStyle = '#22d3ee'
      ctx.fillRect(player.x, player.y, player.w, player.h)

      for (const ob of obstacles) {
        if (ob.type === 'cactus') {
          ctx.fillStyle = '#16a34a'
          ctx.fillRect(ob.x, ob.y, ob.w, ob.h)
          ctx.fillRect(ob.x + 4, ob.y - 8, 6, 8)
        } else if (ob.type === 'rock') {
          ctx.fillStyle = '#a3a3a3'
          ctx.fillRect(ob.x, ob.y, ob.w, ob.h)
        } else if (ob.type === 'crate') {
          ctx.fillStyle = '#b45309'
          ctx.fillRect(ob.x, ob.y, ob.w, ob.h)
          ctx.strokeStyle = '#f59e0b'
          ctx.strokeRect(ob.x + 2, ob.y + 2, ob.w - 4, ob.h - 4)
        } else {
          ctx.fillStyle = '#f97316'
          ctx.fillRect(ob.x, ob.y, ob.w, ob.h)
          ctx.fillStyle = '#fb923c'
          ctx.fillRect(ob.x + 3, ob.y + 5, ob.w - 6, 4)
        }
      }

      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 14px Segoe UI'
      ctx.fillText(`${lang === 'ar' ? 'النقاط' : 'Score'}: ${Math.floor(score)}`, 12, 20)
      ctx.fillText(`${lang === 'ar' ? 'السرعة' : 'Speed'}: ${speed.toFixed(1)}`, 140, 20)

      if (!started) {
        ctx.fillText(lang === 'ar' ? 'اضغط ابدأ' : 'Press Start', 360, 90)
      } else if (!running && alive) {
        ctx.fillText(lang === 'ar' ? 'إيقاف مؤقت' : 'Paused', 375, 90)
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [running, started, seed, lang])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2 text-sm">
        <button onClick={() => { setStarted(true); setRunning(true) }} className="px-3 py-1 rounded-xl border border-emerald-300/40 bg-emerald-500/15">{lang === 'ar' ? 'ابدأ' : 'Start'}</button>
        <button onClick={() => setRunning(false)} className="px-3 py-1 rounded-xl border border-amber-300/40 bg-amber-500/15">{lang === 'ar' ? 'إيقاف مؤقت' : 'Pause'}</button>
        <button onClick={reset} className="px-3 py-1 rounded-xl border border-white/25 bg-white/10">{lang === 'ar' ? 'إعادة' : 'Reset'}</button>
      </div>
      <div className="text-sm opacity-80 mb-2">{lang === 'ar' ? 'SPACE للقفز - P للإيقاف' : 'SPACE to jump - P to pause'}</div>
      <canvas ref={canvasRef} width={820} height={220} className="rounded-xl border border-white/15 w-full max-w-4xl bg-slate-900" />
      <ResultModal state={result} onClose={() => setResult(prev => ({ ...prev, open: false }))} onRestart={reset} lang={lang} />
    </div>
  )
}

type Config = {
  titleEn: string
  titleAr: string
  subtitleEn: string
  subtitleAr: string
  component: (lang: string) => React.ReactNode
}

const gameMap: Record<string, Config> = {
  'tic-tac-toe': {
    titleEn: 'Tic Tac Toe',
    titleAr: 'إكس أو',
    subtitleEn: 'Two-player family classic.',
    subtitleAr: 'لعبة عائلية كلاسيكية لشخصين.',
    component: (lang: string) => <TicTacToeGame lang={lang} />,
  },
  scramble: {
    titleEn: 'Scramble',
    titleAr: 'سكرامبل الكلمات',
    subtitleEn: 'Unscramble words with large bilingual pool.',
    subtitleAr: 'رتب الحروف باستخدام بنك كلمات عربي/إنجليزي كبير.',
    component: (lang: string) => <WordScrambleGame lang={lang} />,
  },
  'memory-match': {
    titleEn: 'Memory Match',
    titleAr: 'مطابقة الذاكرة',
    subtitleEn: 'Multiple board sizes with timer and restart.',
    subtitleAr: 'أحجام متعددة مع مؤقت وزر إعادة.',
    component: (lang: string) => <MemoryMatchGame lang={lang} />,
  },
  snake: {
    titleEn: 'Snake Game',
    titleAr: 'لعبة الثعبان',
    subtitleEn: 'Start/Pause controls and win/lose popups.',
    subtitleAr: 'تحكم ابدأ/إيقاف مؤقت مع نوافذ فوز وخسارة.',
    component: (lang: string) => <SnakeGame lang={lang} />,
  },
  hangman: {
    titleEn: 'Hangman',
    titleAr: 'الرجل المشنوق',
    subtitleEn: 'Bilingual words with category hints.',
    subtitleAr: 'كلمات عربية/إنجليزية مع تلميحات تصنيف.',
    component: (lang: string) => <HangmanGame lang={lang} />,
  },
  platformer: {
    titleEn: 'Platformer',
    titleAr: 'لعبة منصات',
    subtitleEn: 'Dino-style progressive difficulty with varied barriers.',
    subtitleAr: 'صعوبة متدرجة بأسلوب الديناصور مع عوائق متنوعة.',
    component: (lang: string) => <PlatformerGame lang={lang} />,
  },
}

export default function Al3abiFamilyLocalGame() {
  const { slug } = useParams()
  const { lang } = useI18n()
  const config = useMemo(() => gameMap[String(slug || '').toLowerCase()], [slug])

  return (
    <div className="p-6">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => (window.location.href = '/al3abi/family')}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20"
        >
          {lang === 'ar' ? 'العودة للألعاب العائلية' : 'Back to Family Games'}
        </button>
      </div>

      {!config ? (
        <AnimatedCard className="p-6">{lang === 'ar' ? 'اللعبة غير موجودة.' : 'Game not found.'}</AnimatedCard>
      ) : (
        <AnimatedCard className="p-6">
          <h1 className="text-2xl font-bold mb-1">{lang === 'ar' ? config.titleAr : config.titleEn}</h1>
          <p className="text-sm opacity-75 mb-4">{lang === 'ar' ? config.subtitleAr : config.subtitleEn}</p>
          {config.component(lang)}
        </AnimatedCard>
      )}
    </div>
  )
}
