import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import AnimatedCard from '../components/AnimatedCard'
import FancyInput from '../components/FancyInput'
import AnimatedButton from '../components/AnimatedButton'
import { useI18n } from '../contexts/I18nContext'

export default function SignUp() {
  const { t } = useI18n()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    // client-side validation
    if (password.length < 6 || !/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      setError(t('passwordReq'))
      return
    }
    try {
      await axios.post(`${(import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'}/auth/signup`, { username, email, password })
      navigate('/activate', { state: { email } })
    } catch (err: any) {
      setError(err?.response?.data?.message || (t('signUp') + ' failed'))
    }
  }

  return (
    <div className="flex items-center justify-center py-12 w-full">
      <AnimatedCard className="p-6 sm:p-7 w-full max-w-5xl">
        <form onSubmit={submit}>
          <h1 className="text-3xl font-bold mb-4">{t('signUp')}</h1>
          <FancyInput label={t('username')} value={username} onChange={e => setUsername(e.target.value)} placeholder={t('username')} />
          <FancyInput label={t('email')} value={email} onChange={e => setEmail(e.target.value)} placeholder={t('email')} />
          <FancyInput label={t('password')} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('password')} />
          <div className="text-sm text-sky-200 mb-4">{t('passwordReq')}</div>
          {error && <div className="text-rose-400 mb-2">{error}</div>}
          <AnimatedButton type="submit" className="w-full">{t('createAccount')}</AnimatedButton>
          <div className="mt-4 text-sm">
            {"Already have an account?"} <Link to="/signin" className="text-sky-300 underline">{t('signIn')}</Link>
          </div>
        </form>
      </AnimatedCard>
    </div>
  )
}
