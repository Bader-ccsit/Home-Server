import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'
import FancyInput from '../components/FancyInput'
import { useI18n } from '../contexts/I18nContext'

export default function SecretsVerify() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [hasSentOtp, setHasSentOtp] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function authHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function requestOtp() {
    if (sending || cooldownSeconds > 0) return
    setSending(true)
    setError('')
    setMessage('')
    try {
      await axios.post(`${apiBase}/secrets/request-access-otp`, {}, { headers: authHeaders() })
      setHasSentOtp(true)
      setCooldownSeconds(120)
      setMessage(t('secretsOtpSent'))
    } catch (err: any) {
      setError(err?.response?.data?.message || t('secretsOtpSendFailed'))
    } finally {
      setSending(false)
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await axios.post(
        `${apiBase}/secrets/verify-access-otp`,
        { otp: otp.trim() },
        { headers: authHeaders() },
      )
      const token = String(res?.data?.token || '')
      const expiresInSeconds = Number(res?.data?.expiresInSeconds || 1200)
      if (!token) throw new Error('Missing secrets token')
      localStorage.setItem('secretsToken', token)
      localStorage.setItem('secretsTokenExpiry', String(Date.now() + expiresInSeconds * 1000))
      navigate('/secrets')
    } catch (err: any) {
      setError(err?.response?.data?.message || t('secretsOtpInvalid'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = window.setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldownSeconds])

  const cooldownLabel = `${String(Math.floor(cooldownSeconds / 60)).padStart(2, '0')}:${String(cooldownSeconds % 60).padStart(2, '0')}`

  return (
    <div className="p-6 max-w-xl mx-auto w-full">
      <AnimatedCard className="p-6">
        <h1 className="text-2xl font-bold mb-2">{t('secretsTitle')}</h1>
        <p className="text-sm opacity-80 mb-4">{t('secretsOtpPrompt')}</p>

        <form onSubmit={verifyOtp} className="space-y-3">
          <FancyInput
            label={t('otp')}
            value={otp}
            onChange={(e: any) => setOtp(e.target.value)}
            placeholder={t('otp')}
          />

          {message && <div className="text-emerald-300 text-sm">{message}</div>}
          {error && <div className="text-rose-400 text-sm">{error}</div>}

          <div className="flex flex-wrap gap-2">
            <AnimatedButton type="submit" disabled={loading || !otp.trim()}>
              {loading ? t('secretsVerifying') : t('secretsEnterVault')}
            </AnimatedButton>
            <AnimatedButton type="button" onClick={requestOtp} disabled={sending || cooldownSeconds > 0} className="bg-white/10">
              {sending
                ? t('secretsSendingOtp')
                : hasSentOtp
                  ? `${t('resendOtp')}${cooldownSeconds > 0 ? ` (${cooldownLabel})` : ''}`
                  : t('sendOtp')}
            </AnimatedButton>
          </div>
        </form>
      </AnimatedCard>
    </div>
  )
}
