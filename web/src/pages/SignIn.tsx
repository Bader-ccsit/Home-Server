import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from '../contexts/ThemeContext'
import FancyInput from '../components/FancyInput'
import AnimatedCard from '../components/AnimatedCard'
import AnimatedButton from '../components/AnimatedButton'

export default function SignIn() {
  const { t } = useI18n()
  const { theme } = useTheme()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await axios.post(`${(import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'}/auth/signin`, { identifier, password })
      if (res.data && res.data.needsActivation) {
        navigate('/activate', { state: { email: res.data.email || identifier } })
        return
      }
      // store token if provided
      if (res.data.token) localStorage.setItem('token', res.data.token)
      navigate('/home')
    } catch (err: any) {
      setError(err?.response?.data?.message || (t('signIn') + ' failed'))
    }
  }

  return (
    <div className="flex items-center justify-center py-12">
      <AnimatedCard>
        <form onSubmit={submit}>
          <h1 className="text-3xl font-bold mb-2">{t('welcomeBack')}</h1>
          <p className="text-sm text-white/75 mb-6">{t('signIn')}</p>

          <FancyInput label={t('emailOrUsername')} value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={t('emailOrUsername')} />

          <FancyInput label={t('password')} value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder={t('password')} />
          <div className="flex justify-end mb-4">
            <button type="button" onClick={() => setShowPassword(s => !s)} className="text-xs opacity-80">{showPassword ? 'Hide' : 'Show'}</button>
          </div>

          {error && <div className="text-rose-400 mb-2">{error}</div>}
          <AnimatedButton type="submit" className="w-full">{t('signIn')}</AnimatedButton>

          <div className="mt-4 text-sm text-white/90">
            <div>{t('signUp')}? <Link to="/signup" className="text-sky-300 underline">{t('createAccount')}</Link></div>
            <div className="mt-2">
              <Link to="/reset" className="text-sky-300 underline">{t('forgotPassword')}</Link>
            </div>
          </div>
        </form>
      </AnimatedCard>
    </div>
  )
}
