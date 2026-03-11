import React, { useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import AnimatedCard from '../components/AnimatedCard'
import FancyInput from '../components/FancyInput'
import AnimatedButton from '../components/AnimatedButton'

function passwordValid(p: string) {
  if (!p || p.length < 6) return false
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p)) return false
  return true
}

export default function Reset() {
  const { t } = useI18n()
  const [step, setStep] = useState(1)
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function requestReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await axios.post(`${(import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'}/auth/request-password-reset`, { identifier })
      setInfo('OTP sent to the email associated with that account. Check your inbox.')
      setStep(2)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Request failed')
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!passwordValid(newPassword)) return setError('Password must be at least 6 characters and contain a number or special character')
    if (newPassword !== confirm) return setError('Passwords do not match')
    try {
      await axios.post(`${(import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'}/auth/reset-password`, { identifier, otp, newPassword })
      setInfo('Password reset successful — you may now sign in.')
      setStep(3)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Reset failed')
    }
  }

  return (
    <div className="flex items-center justify-center py-12 w-full">
      <AnimatedCard className="p-6 sm:p-7 w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-4">{t('resetPassword')}</h1>
        {step === 1 && (
          <form onSubmit={requestReset}>
            <FancyInput label={t('emailOrUsername')} value={identifier} onChange={e => setIdentifier(e.target.value)} />
            {error && <div className="text-rose-400 mb-2">{error}</div>}
            <AnimatedButton type="submit" className="w-full">{t('sendOtp')}</AnimatedButton>
            <div className="mt-4 text-sm">
              Remembered? <Link to="/signin" className="text-sky-300 underline">{t('signIn')}</Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitReset}>
            <div className="mb-2 text-sm text-sky-200">{t('resetPassword')}</div>
            <FancyInput label={t('otp')} value={otp} onChange={e => setOtp(e.target.value)} />
            <FancyInput label={t('newPassword')} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <div className="text-sm text-sky-200 mb-2">{t('passwordReq')}</div>
            <FancyInput label={t('confirmPassword')} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            {error && <div className="text-rose-400 mb-2">{error}</div>}
            <AnimatedButton type="submit" className="w-full">{t('resetPassword')}</AnimatedButton>
          </form>
        )}

        {step === 3 && (
          <div>
            <div className="text-green-400 mb-4">{info}</div>
            <div className="mt-4 text-sm">
              <Link to="/signin" className="text-sky-300 underline">{t('signIn')}</Link>
            </div>
          </div>
        )}

        {info && step !== 3 && <div className="text-sky-200 mt-4">{info}</div>}
      </AnimatedCard>
    </div>
  )
}
