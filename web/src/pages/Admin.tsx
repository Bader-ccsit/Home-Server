import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import FancyInput from '../components/FancyInput'
import { useI18n } from '../contexts/I18nContext'

type Overview = {
  serverTime: string
  process: { uptimeSeconds: number; memoryRssBytes: number }
  metrics: {
    totalUsers: number
    activatedUsers: number
    totalStorageUsedBytes: number
    totalAflamiMovies: number
    totalSecretCredentials: number
    totalShoppingItems: number
    totalAl3abiGames: number
    totalPasteMeEntries: number
  }
  users: Array<{ id: string; username: string; email: string; activated: boolean }>
}

function bytesToHuman(n: number) {
  if (!n || n <= 0) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = n
  let i = 0
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${u[i]}`
}

export default function Admin() {
  const { t, lang } = useI18n()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'

  const [username, setUsername] = useState('Admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [fetchingOverview, setFetchingOverview] = useState(false)
  const [activeUserMenuId, setActiveUserMenuId] = useState<string | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const isAuthed = !!localStorage.getItem('adminToken')

  function adminHeaders() {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${apiBase}/admin/auth/signin`, {
        username: username.trim(),
        password,
      })

      const token = String(res?.data?.token || '')
      const expiresInSeconds = Number(res?.data?.expiresInSeconds || 0)
      if (!token) throw new Error('Missing admin token')

      localStorage.setItem('adminToken', token)
      if (expiresInSeconds > 0) {
        localStorage.setItem('adminTokenExpiry', String(Date.now() + expiresInSeconds * 1000))
      }
      setPassword('')
      await loadOverview()
    } catch (err: any) {
      setError(err?.response?.data?.message || t('adminSignInFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function loadOverview() {
    if (!localStorage.getItem('adminToken')) return
    setFetchingOverview(true)
    setError('')
    try {
      const res = await axios.get(`${apiBase}/admin/overview`, { headers: adminHeaders() })
      setOverview(res.data || null)
    } catch (err: any) {
      const status = Number(err?.response?.status || 0)
      if (status === 401) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminTokenExpiry')
        setOverview(null)
      }
      setError(err?.response?.data?.message || t('adminLoadFailed'))
    } finally {
      setFetchingOverview(false)
    }
  }

  function signOutAdmin() {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminTokenExpiry')
    setOverview(null)
  }

  async function changeUsername(userId: string, currentValue: string) {
    const next = window.prompt(t('adminChangeUsernamePrompt'), currentValue)
    if (next === null) return
    const value = next.trim()
    if (!value) return
    setBusyUserId(userId)
    setError('')
    try {
      await axios.patch(`${apiBase}/admin/users/${userId}/username`, { username: value }, { headers: adminHeaders() })
      await loadOverview()
    } catch (err: any) {
      setError(err?.response?.data?.message || t('adminActionFailed'))
    } finally {
      setBusyUserId(null)
      setActiveUserMenuId(null)
    }
  }

  async function changeEmail(userId: string, currentValue: string) {
    const next = window.prompt(t('adminChangeEmailPrompt'), currentValue)
    if (next === null) return
    const value = next.trim()
    if (!value) return
    setBusyUserId(userId)
    setError('')
    try {
      await axios.patch(`${apiBase}/admin/users/${userId}/email`, { email: value }, { headers: adminHeaders() })
      await loadOverview()
    } catch (err: any) {
      setError(err?.response?.data?.message || t('adminActionFailed'))
    } finally {
      setBusyUserId(null)
      setActiveUserMenuId(null)
    }
  }

  async function changePassword(userId: string) {
    const next = window.prompt(t('adminChangePasswordPrompt'))
    if (next === null) return
    const value = next.trim()
    if (!value) return
    setBusyUserId(userId)
    setError('')
    try {
      await axios.patch(`${apiBase}/admin/users/${userId}/password`, { password: value }, { headers: adminHeaders() })
      await loadOverview()
    } catch (err: any) {
      setError(err?.response?.data?.message || t('adminActionFailed'))
    } finally {
      setBusyUserId(null)
      setActiveUserMenuId(null)
    }
  }

  async function deleteUser(userId: string, usernameValue: string) {
    if (!window.confirm(`${t('adminDeleteUserConfirm')} (${usernameValue})?`)) return
    setBusyUserId(userId)
    setError('')
    try {
      await axios.delete(`${apiBase}/admin/users/${userId}`, { headers: adminHeaders() })
      await loadOverview()
    } catch (err: any) {
      setError(err?.response?.data?.message || t('adminActionFailed'))
    } finally {
      setBusyUserId(null)
      setActiveUserMenuId(null)
    }
  }

  useEffect(() => {
    const expiryRaw = localStorage.getItem('adminTokenExpiry')
    const expiry = Number(expiryRaw || 0)
    if (expiry > 0 && Date.now() > expiry) {
      signOutAdmin()
      return
    }
    if (localStorage.getItem('adminToken')) {
      loadOverview()
    }
  }, [])

  const cards = useMemo(() => {
    if (!overview) return []
    return [
      { label: t('adminTotalUsers'), value: overview.metrics.totalUsers },
      { label: t('adminActivatedUsers'), value: overview.metrics.activatedUsers },
      { label: t('adminTotalStorage'), value: bytesToHuman(overview.metrics.totalStorageUsedBytes) },
      { label: t('adminAflamiMovies'), value: overview.metrics.totalAflamiMovies },
      { label: t('adminSecretsItems'), value: overview.metrics.totalSecretCredentials },
      { label: t('adminShoppingItems'), value: overview.metrics.totalShoppingItems },
      { label: t('adminAl3abiGames'), value: overview.metrics.totalAl3abiGames },
      { label: t('adminPasteMeEntries'), value: overview.metrics.totalPasteMeEntries },
    ]
  }, [overview, t])

  return (
    <div className="p-6 space-y-5">
      <AnimatedCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h1 className="text-2xl font-bold">{t('adminTitle')}</h1>
          {isAuthed && (
            <div className="flex gap-2">
              <AnimatedButton onClick={loadOverview} className="px-4 py-2 text-sm" disabled={fetchingOverview}>{fetchingOverview ? t('adminRefreshing') : t('adminRefresh')}</AnimatedButton>
              <button onClick={signOutAdmin} className="px-4 py-2 rounded-xl border border-rose-300/40 bg-rose-500/20 hover:bg-rose-500/30 text-sm">{t('logout')}</button>
            </div>
          )}
        </div>
        <p className="text-sm opacity-80">{t('adminSubtitle')}</p>
      </AnimatedCard>

      {!isAuthed ? (
        <AnimatedCard className="p-6 max-w-2xl mx-auto">
          <form onSubmit={signIn}>
            <div className="text-lg font-semibold mb-3">{t('adminSignIn')}</div>
            <FancyInput label={t('username')} value={username} onChange={(e: any) => setUsername(e.target.value)} placeholder={t('username')} />
            <FancyInput label={t('password')} type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder={t('password')} />
            {error && <div className="text-rose-400 text-sm mb-3">{error}</div>}
            <AnimatedButton type="submit" className="w-full" disabled={loading || !username.trim() || !password}>{loading ? t('adminSigningIn') : t('adminSignIn')}</AnimatedButton>
          </form>
        </AnimatedCard>
      ) : (
        <>
          {error && <AnimatedCard className="p-4 text-rose-300">{error}</AnimatedCard>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map(c => (
              <AnimatedCard key={c.label} className="p-4">
                <div className="text-xs opacity-75 mb-1">{c.label}</div>
                <div className="text-2xl font-black">{c.value}</div>
              </AnimatedCard>
            ))}
          </div>

          <AnimatedCard className="p-5">
            <div className="flex flex-wrap justify-between gap-2 mb-3">
              <div className="font-semibold">{t('adminUsersList')}</div>
              {overview && (
                <div className="text-xs opacity-75">
                  {t('adminServerTime')}: {new Date(overview.serverTime).toLocaleString(lang === 'ar' ? 'ar' : 'en')}
                  {' | '}
                  {t('adminUptime')}: {overview.process.uptimeSeconds}s
                  {' | '}
                  RSS: {bytesToHuman(overview.process.memoryRssBytes)}
                </div>
              )}
            </div>

            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left min-w-[720px]">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-3 py-2 text-xs">ID</th>
                    <th className="px-3 py-2 text-xs">{t('username')}</th>
                    <th className="px-3 py-2 text-xs">{t('email')}</th>
                    <th className="px-3 py-2 text-xs">{t('adminActivated')}</th>
                    <th className="px-3 py-2 text-xs text-right">{t('adminActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.users || []).map(u => (
                    <tr key={u.id} className="border-t border-white/10">
                      <td className="px-3 py-2 text-xs opacity-80">{u.id}</td>
                      <td className="px-3 py-2 text-sm">{u.username}</td>
                      <td className="px-3 py-2 text-sm">{u.email}</td>
                      <td className="px-3 py-2 text-sm">{u.activated ? t('adminYes') : t('adminNo')}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/5 hover:bg-white/15 disabled:opacity-60"
                            onClick={() => setActiveUserMenuId(prev => prev === u.id ? null : u.id)}
                            disabled={busyUserId === u.id}
                            aria-label={t('adminActions')}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>

                          {activeUserMenuId === u.id && (
                            <div className="absolute top-10 right-0 z-20 min-w-[190px] rounded-xl border border-white/20 bg-slate-950/95 p-1 shadow-2xl backdrop-blur">
                              <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10" onClick={() => changeUsername(u.id, u.username)}>{t('adminChangeUsername')}</button>
                              <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10" onClick={() => changeEmail(u.id, u.email)}>{t('adminChangeEmail')}</button>
                              <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10" onClick={() => changePassword(u.id)}>{t('adminChangePassword')}</button>
                              <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/20" onClick={() => deleteUser(u.id, u.username)}>{t('adminDeleteUser')}</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedCard>
        </>
      )}
    </div>
  )
}
