import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import FancyInput from '../components/FancyInput'
import { useI18n } from '../contexts/I18nContext'

type SecretListItem = {
  id: string
  credentialName: string
  importance: 'high' | 'low'
  createdAt: string
  updatedAt: string
}

type SecretDetail = {
  id: string
  credentialName: string
  username: string
  password: string
  details: string
  importance: 'high' | 'low'
  createdAt: string
  updatedAt: string
}

type SortMode = 'newest' | 'oldest' | 'importance_high' | 'importance_low'

function IconButton({ onClick, title, children, danger = false }: { onClick: () => void; title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`h-9 w-9 inline-flex items-center justify-center rounded-full border transition ${danger ? 'border-rose-300/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-100' : 'border-white/20 bg-white/5 hover:bg-white/10 text-white/90'}`}
    >
      {children}
    </button>
  )
}

function ExitIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 21H12a2 2 0 0 1-2-2v-2"/><path d="M10 7V5a2 2 0 0 1 2-2h9"/></svg>
}

function PencilIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
}

function BinIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
}

function EyeIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
}

function EyeOffIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.86 21.86 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-3.17 4.31"/><path d="M1 1l22 22"/></svg>
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
}

export default function Secrets() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('newest')
  const [items, setItems] = useState<SecretListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string>('')
  const [detail, setDetail] = useState<SecretDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  const [credentialName, setCredentialName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [details, setDetails] = useState('')
  const [importance, setImportance] = useState<'high' | 'low'>('low')

  const [showUsername, setShowUsername] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showFormPassword, setShowFormPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<'username' | 'password' | 'details' | ''>('')
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function clearSecretsSession() {
    localStorage.removeItem('secretsToken')
    localStorage.removeItem('secretsTokenExpiry')
  }

  function authHeaders() {
    const token = localStorage.getItem('token')
    const secretsToken = localStorage.getItem('secretsToken')
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(secretsToken ? { 'X-Secrets-Token': secretsToken } : {}),
    }
  }

  function ensureSecretsSession() {
    const expiry = Number(localStorage.getItem('secretsTokenExpiry') || 0)
    if (!expiry || Date.now() >= expiry) {
      clearSecretsSession()
      navigate('/home')
      return false
    }
    if (!localStorage.getItem('secretsToken')) {
      navigate('/secrets/verify')
      return false
    }
    return true
  }

  function resetFormFromDetail(d?: SecretDetail | null) {
    setCredentialName(d?.credentialName || '')
    setUsername(d?.username || '')
    setPassword(d?.password || '')
    setDetails(d?.details || '')
    setImportance(d?.importance || 'low')
    setShowFormPassword(false)
  }

  async function copyField(field: 'username' | 'password' | 'details', value: string) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const el = document.createElement('textarea')
        el.value = value
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopiedField(field)
      setTimeout(() => setCopiedField(''), 1200)
    } catch {
      setError(t('secretsCopyFailed'))
    }
  }

  function requestExit() {
    setShowExitConfirm(true)
  }

  function cancelExit() {
    setShowExitConfirm(false)
  }

  function confirmExit() {
    clearSecretsSession()
    setShowExitConfirm(false)
    navigate('/home', { replace: true })
  }

  function requestDeleteCredential() {
    if (!selectedId) return
    setShowDeleteConfirm(true)
  }

  function cancelDeleteCredential() {
    setShowDeleteConfirm(false)
  }

  async function confirmDeleteCredential() {
    if (!selectedId) return
    if (!ensureSecretsSession()) return
    setError('')
    try {
      await axios.delete(`${apiBase}/secrets/credentials/${encodeURIComponent(selectedId)}`, {
        headers: authHeaders(),
      })
      setSelectedId('')
      setDetail(null)
      setEditing(false)
      setShowDeleteConfirm(false)
      resetFormFromDetail(null)
      await loadList()
    } catch (err: any) {
      const code = err?.response?.status
      if (code === 401 || code === 403) {
        clearSecretsSession()
        navigate('/home')
        return
      }
      setError(err?.response?.data?.message || t('secretsDeleteFailed'))
    }
  }

  async function loadList() {
    if (!ensureSecretsSession()) return
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${apiBase}/secrets/credentials`, {
        params: { q: query, sort },
        headers: authHeaders(),
      })
      setItems(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) {
      const code = err?.response?.status
      if (code === 401 || code === 403) {
        clearSecretsSession()
        navigate('/home')
        return
      }
      setError(err?.response?.data?.message || t('secretsLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function loadDetail(id: string) {
    if (!ensureSecretsSession()) return
    setDetailLoading(true)
    setError('')
    try {
      const res = await axios.get(`${apiBase}/secrets/credentials/${encodeURIComponent(id)}`, {
        headers: authHeaders(),
      })
      const d = res.data as SecretDetail
      setDetail(d)
      setSelectedId(id)
      setEditing(false)
      setShowAdd(false)
      setShowUsername(false)
      setShowPassword(false)
      setShowDetails(false)
      resetFormFromDetail(d)
    } catch (err: any) {
      const code = err?.response?.status
      if (code === 401 || code === 403) {
        clearSecretsSession()
        navigate('/home')
        return
      }
      setError(err?.response?.data?.message || t('secretsLoadFailed'))
    } finally {
      setDetailLoading(false)
    }
  }

  async function createCredential(e: React.FormEvent) {
    e.preventDefault()
    if (!ensureSecretsSession()) return
    setError('')

    if (!credentialName.trim() || !username.trim() || !password.trim()) {
      setError(t('secretsRequiredFields'))
      return
    }
    if (details.length > 1500) {
      setError(t('secretsDetailsTooLong'))
      return
    }

    try {
      const res = await axios.post(
        `${apiBase}/secrets/credentials`,
        { credentialName, username, password, details, importance },
        { headers: authHeaders() },
      )
      setShowAdd(false)
      resetFormFromDetail(null)
      await loadList()
      if (res?.data?.id) {
        await loadDetail(String(res.data.id))
      }
    } catch (err: any) {
      const code = err?.response?.status
      if (code === 401 || code === 403) {
        clearSecretsSession()
        navigate('/home')
        return
      }
      setError(err?.response?.data?.message || t('secretsSaveFailed'))
    }
  }

  async function saveEdit() {
    if (!detail || !selectedId) return
    if (!ensureSecretsSession()) return
    setError('')

    if (!credentialName.trim() || !username.trim() || !password.trim()) {
      setError(t('secretsRequiredFields'))
      return
    }
    if (details.length > 1500) {
      setError(t('secretsDetailsTooLong'))
      return
    }

    try {
      await axios.patch(
        `${apiBase}/secrets/credentials/${encodeURIComponent(selectedId)}`,
        { credentialName, username, password, details, importance },
        { headers: authHeaders() },
      )
      await loadList()
      await loadDetail(selectedId)
      setEditing(false)
    } catch (err: any) {
      const code = err?.response?.status
      if (code === 401 || code === 403) {
        clearSecretsSession()
        navigate('/home')
        return
      }
      setError(err?.response?.data?.message || t('secretsSaveFailed'))
    }
  }

  useEffect(() => {
    if (!ensureSecretsSession()) return
    loadList()
  }, [sort])

  useEffect(() => {
    const timer = setTimeout(() => loadList(), 250)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!ensureSecretsSession()) return
    const tick = () => {
      const expiry = Number(localStorage.getItem('secretsTokenExpiry') || 0)
      const left = Math.max(0, Math.floor((expiry - Date.now()) / 1000))
      setRemainingSeconds(left)
      if (left <= 0) {
        clearSecretsSession()
        navigate('/home')
      }
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!ensureSecretsSession()) return

    window.history.pushState({ secretsGuard: true }, '')
    const onPopState = () => {
      window.history.pushState({ secretsGuard: true }, '')
      setShowExitConfirm(true)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const selectedName = useMemo(() => {
    const row = items.find(i => i.id === selectedId)
    return row?.credentialName || ''
  }, [items, selectedId])

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <AnimatedCard className="!max-w-none !mx-0 p-5 sm:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[0.88fr_1.12fr] gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] uppercase tracking-[0.22em] text-sky-200/80">Secure Vault</span>
              <div className="h-px flex-1 min-w-[80px] bg-gradient-to-r from-sky-300/40 to-transparent" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('secretsTitle')}</h1>
            <p className="text-sm opacity-75 mt-1">{t('secretsServiceDesc')}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 xl:-ml-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center rounded-full border border-amber-300/35 bg-amber-200/10 px-3 py-1 text-xs text-amber-100">
                {t('secretsSessionExpiresIn')} {Math.max(0, Math.ceil(remainingSeconds / 60))} {t('secretsMinutesShort')}
              </div>
              <button
                type="button"
                onClick={requestExit}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white/85"
                title={t('secretsExit')}
                aria-label={t('secretsExit')}
              >
                <ExitIcon />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_210px] gap-3 items-start">
              <div>
                <FancyInput
                  label={t('secretsSearchLabel')}
                  value={query}
                  onChange={(e: any) => setQuery(e.target.value)}
                  placeholder={t('secretsSearchPlaceholder')}
                />
              </div>
              <div>
                <label className="text-sm opacity-80 mb-2 block">{t('secretsSortBy')}</label>
                <select
                  value={sort}
                  onChange={(e: any) => setSort(e.target.value as SortMode)}
                  className="secrets-select w-full h-[46px] rounded-md bg-white/5 border border-white/20 px-3 text-white"
                >
                  <option value="newest">{t('secretsSortNewest')}</option>
                  <option value="oldest">{t('secretsSortOldest')}</option>
                  <option value="importance_high">{t('secretsSortImportanceHigh')}</option>
                  <option value="importance_low">{t('secretsSortImportanceLow')}</option>
                </select>
                <div className="fancy-underline mt-2 active" />
              </div>
            </div>

            <div className="mt-2">
              <AnimatedButton
                onClick={() => {
                  setShowAdd(true)
                  setEditing(false)
                  setDetail(null)
                  setSelectedId('')
                  resetFormFromDetail(null)
                  setShowFormPassword(false)
                }}
                className="w-full sm:w-auto"
              >
                {t('secretsAddNew')}
              </AnimatedButton>
            </div>
          </div>
        </div>

        {error && <div className="text-rose-400 text-sm mt-3">{error}</div>}
      </AnimatedCard>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-3 items-start">
        <AnimatedCard className="!max-w-none !mx-0 p-5 sm:p-6 xl:sticky xl:top-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{t('secretsSavedCredentials')}</h2>
            <span className="text-xs opacity-65">{items.length}</span>
          </div>

          {loading ? (
            <div className="text-sm opacity-80 py-4">{t('secretsLoading')}</div>
          ) : items.length === 0 ? (
            <div className="text-sm opacity-80 py-4">{t('secretsNoResults')}</div>
          ) : (
            <div className="space-y-2 max-h-[58vh] overflow-auto pr-1">
              {items.map(item => (
                <button
                  key={item.id}
                  className={`w-full text-left p-3 rounded-xl border transition ${selectedId === item.id ? 'border-sky-300 bg-white/10 shadow-[0_0_0_1px_rgba(125,211,252,0.15)]' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                  onClick={() => loadDetail(item.id)}
                >
                  <div className="font-semibold text-base leading-6 line-clamp-2">{item.credentialName}</div>
                </button>
              ))}
            </div>
          )}
        </AnimatedCard>

        <AnimatedCard className="!max-w-none !mx-0 p-5 sm:p-6 xl:min-h-[560px]">
          {showAdd ? (
            <form className="space-y-4" onSubmit={createCredential}>
              <h2 className="text-xl font-semibold">{t('secretsAddNew')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FancyInput label={t('secretsCredentialName')} value={credentialName} onChange={(e: any) => setCredentialName(e.target.value)} />
                <FancyInput label={t('username')} value={username} onChange={(e: any) => setUsername(e.target.value)} />
              </div>

              <div className="mb-4">
                <label className="block text-sm mb-2">{t('password')}</label>
                <div className="fancy-input relative">
                  <input
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    type={showFormPassword ? 'text' : 'password'}
                    className="w-full bg-transparent border-0 p-0 pr-20 text-white placeholder:opacity-60"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10"
                    title={showFormPassword ? t('secretsHide') : t('secretsShow')}
                    aria-label={showFormPassword ? t('secretsHide') : t('secretsShow')}
                    onClick={() => setShowFormPassword(v => !v)}
                  >
                    {showFormPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div className={`fancy-underline mt-2 ${password ? 'active' : ''}`} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-sm opacity-80 mb-1 block">{t('secretsMoreDetailsOptional')}</label>
                  <textarea
                    value={details}
                    onChange={(e: any) => setDetails(e.target.value)}
                    maxLength={1500}
                    rows={6}
                    className="w-full rounded-md bg-white/5 border border-white/15 p-3"
                  />
                  <div className="text-xs opacity-60 mt-1">{details.length}/1500</div>
                </div>
                <div>
                  <label className="text-sm opacity-80 mb-1 block">{t('secretsImportance')}</label>
                  <select
                    value={importance}
                    onChange={(e: any) => setImportance(e.target.value as 'high' | 'low')}
                    className="secrets-select w-full h-[46px] rounded-md bg-white/5 border border-white/20 px-3 text-white"
                  >
                    <option value="high">{t('secretsImportanceHigh')}</option>
                    <option value="low">{t('secretsImportanceLow')}</option>
                  </select>
                </div>
              </div>

              <AnimatedButton type="submit">{t('secretsSaveCredential')}</AnimatedButton>
            </form>
          ) : detailLoading ? (
            <div className="text-sm opacity-80 py-4">{t('secretsLoading')}</div>
          ) : !detail ? (
            <div className="text-sm opacity-80 py-4">{t('secretsSelectCredential')}</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-xl font-semibold break-words">{selectedName || detail.credentialName}</h2>
                <div className="flex flex-wrap gap-2">
                  <IconButton onClick={() => {
                    setShowFormPassword(false)
                    setEditing(e => !e)
                  }} title={editing ? t('secretsCancelEdit') : t('secretsEdit')}>
                    <PencilIcon />
                  </IconButton>
                  <IconButton onClick={requestDeleteCredential} title={t('secretsDelete')} danger>
                    <BinIcon />
                  </IconButton>
                </div>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FancyInput label={t('secretsCredentialName')} value={credentialName} onChange={(e: any) => setCredentialName(e.target.value)} />
                    <FancyInput label={t('username')} value={username} onChange={(e: any) => setUsername(e.target.value)} />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm mb-2">{t('password')}</label>
                    <div className="fancy-input relative">
                      <input
                        value={password}
                        onChange={(e: any) => setPassword(e.target.value)}
                        type={showFormPassword ? 'text' : 'password'}
                        className="w-full bg-transparent border-0 p-0 pr-20 text-white placeholder:opacity-60"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10"
                        title={showFormPassword ? t('secretsHide') : t('secretsShow')}
                        aria-label={showFormPassword ? t('secretsHide') : t('secretsShow')}
                        onClick={() => setShowFormPassword(v => !v)}
                      >
                        {showFormPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                    <div className={`fancy-underline mt-2 ${password ? 'active' : ''}`} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-sm opacity-80 mb-1 block">{t('secretsMoreDetailsOptional')}</label>
                      <textarea
                        value={details}
                        onChange={(e: any) => setDetails(e.target.value)}
                        maxLength={1500}
                        rows={6}
                        className="w-full rounded-md bg-white/5 border border-white/15 p-3"
                      />
                      <div className="text-xs opacity-60 mt-1">{details.length}/1500</div>
                    </div>
                    <div>
                      <label className="text-sm opacity-80 mb-1 block">{t('secretsImportance')}</label>
                      <select
                        value={importance}
                        onChange={(e: any) => setImportance(e.target.value as 'high' | 'low')}
                        className="secrets-select w-full h-[46px] rounded-md bg-white/5 border border-white/20 px-3 text-white"
                      >
                        <option value="high">{t('secretsImportanceHigh')}</option>
                        <option value="low">{t('secretsImportanceLow')}</option>
                      </select>
                    </div>
                  </div>

                  <AnimatedButton onClick={saveEdit}>{t('aflamiSaveChanges')}</AnimatedButton>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="text-sm opacity-80 mb-2">{t('username')}</div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="font-mono text-base break-all">{showUsername ? detail.username : '********'}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        <IconButton onClick={() => setShowUsername(v => !v)} title={showUsername ? t('secretsHide') : t('secretsShow')}>
                          {showUsername ? <EyeOffIcon /> : <EyeIcon />}
                        </IconButton>
                        {showUsername && (
                          <IconButton onClick={() => copyField('username', detail.username)} title={copiedField === 'username' ? t('secretsCopied') : t('secretsCopy')}>
                            <CopyIcon />
                          </IconButton>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="text-sm opacity-80 mb-2">{t('password')}</div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="font-mono text-base break-all">{showPassword ? detail.password : '********'}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        <IconButton onClick={() => setShowPassword(v => !v)} title={showPassword ? t('secretsHide') : t('secretsShow')}>
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </IconButton>
                        {showPassword && (
                          <IconButton onClick={() => copyField('password', detail.password)} title={copiedField === 'password' ? t('secretsCopied') : t('secretsCopy')}>
                            <CopyIcon />
                          </IconButton>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="text-sm opacity-80 mb-2">{t('secretsMoreDetailsOptional')}</div>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="text-base whitespace-pre-wrap break-words">{showDetails ? (detail.details || '-') : '********'}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        <IconButton onClick={() => setShowDetails(v => !v)} title={showDetails ? t('secretsHide') : t('secretsShow')}>
                          {showDetails ? <EyeOffIcon /> : <EyeIcon />}
                        </IconButton>
                        {showDetails && (
                          <IconButton onClick={() => copyField('details', detail.details || '')} title={copiedField === 'details' ? t('secretsCopied') : t('secretsCopy')}>
                            <CopyIcon />
                          </IconButton>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs opacity-70">{t('secretsImportance')}: {detail.importance === 'high' ? t('secretsImportanceHigh') : t('secretsImportanceLow')}</div>
                </div>
              )}
            </div>
          )}
        </AnimatedCard>
      </div>

      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl">
            <div className="text-xl font-semibold mb-2">{t('secretsExitTitle')}</div>
            <p className="text-sm opacity-80 mb-5">{t('secretsExitMessage')}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelExit}
                className="px-4 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10"
              >
                {t('secretsCancel')}
              </button>
              <button
                type="button"
                onClick={confirmExit}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 font-semibold"
              >
                {t('secretsYes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl">
            <div className="text-xl font-semibold mb-2">{t('secretsDeleteTitle')}</div>
            <p className="text-sm opacity-80 mb-5">{t('secretsDeleteConfirm')}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelDeleteCredential}
                className="px-4 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10"
              >
                {t('secretsCancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteCredential}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 font-semibold"
              >
                {t('secretsYes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
