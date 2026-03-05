import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import AnimatedCard from '../components/AnimatedCard'
import FancyInput from '../components/FancyInput'
import AnimatedButton from '../components/AnimatedButton'
import { useI18n } from '../contexts/I18nContext'

export default function Activate() {
  const { t } = useI18n()
  const loc = useLocation() as any
  const initialEmail = loc.state?.email || ''
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')
  const [canResend, setCanResend] = useState(true)
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    try {
      await axios.post(`${(import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'}/auth/verify-otp`, { email, otp })
      navigate('/home')
    } catch (err: any) {
      setMessage(err?.response?.data?.message || (t('activationTitle') + ' failed'))
    }
  }

  async function resend() {
    setMessage('')
    try {
      await axios.post(`${(import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'}/auth/resend-otp`, { email })
      setMessage('OTP resent')
      setCanResend(false)
      setTimeout(() => setCanResend(true), Number((import.meta as any).env?.VITE_OTP_RESEND_BUFFER || 60000))
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Resend failed')
    }
  }

  useEffect(() => {
    // ensure resend state is derived from env on mount
    setCanResend(true)
  }, [])

  return (
    <div className="flex items-center justify-center py-12">
      <AnimatedCard>
        <form onSubmit={submit}>
          <h1 className="text-2xl font-bold mb-4">{t('activationTitle')}</h1>
          <FancyInput label={t('email')} value={email} onChange={e => setEmail(e.target.value)} />
          <FancyInput label={t('otp')} value={otp} onChange={e => setOtp(e.target.value)} />
          {message && <div className="text-rose-400 mb-2">{message}</div>}
          <AnimatedButton type="submit" className="w-full">{t('activationButton')}</AnimatedButton>
          <div className="mt-4 text-sm">
            <button type="button" onClick={resend} disabled={!canResend} className="underline text-sky-300">{t('resendOtp')}</button>
          </div>
        </form>
      </AnimatedCard>
    </div>
  )
}
