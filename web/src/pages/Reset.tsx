import React, { useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

function passwordValid(p: string) {
  if (!p || p.length < 6) return false
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p)) return false
  return true
}

export default function Reset() {
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
      await axios.post(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/auth/request-password-reset`, { identifier })
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
      await axios.post(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/auth/reset-password`, { identifier, otp, newPassword })
      setInfo('Password reset successful — you may now sign in.')
      setStep(3)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Reset failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-900 to-indigo-900 text-white">
      <div className="bg-white/5 backdrop-blur-md p-8 rounded-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Reset password</h1>
        {step === 1 && (
          <form onSubmit={requestReset}>
            <label className="block mb-2">Username or Email</label>
            <input className="w-full p-2 rounded mb-4 text-black" value={identifier} onChange={e => setIdentifier(e.target.value)} />
            {error && <div className="text-rose-400 mb-2">{error}</div>}
            <button className="w-full bg-indigo-500 py-2 rounded font-semibold">Send OTP</button>
            <div className="mt-4 text-sm">
              Remembered? <Link to="/signin" className="text-sky-300 underline">Sign in</Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitReset}>
            <div className="mb-2 text-sm text-sky-200">Enter the OTP sent to your email and choose a new password.</div>
            <label className="block mb-2">OTP</label>
            <input className="w-full p-2 rounded mb-4 text-black" value={otp} onChange={e => setOtp(e.target.value)} />
            <label className="block mb-2">New password</label>
            <input type="password" className="w-full p-2 rounded mb-2 text-black" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <div className="text-sm text-sky-200 mb-2">Password must be at least 6 characters and contain a number or special character.</div>
            <label className="block mb-2">Confirm password</label>
            <input type="password" className="w-full p-2 rounded mb-4 text-black" value={confirm} onChange={e => setConfirm(e.target.value)} />
            {error && <div className="text-rose-400 mb-2">{error}</div>}
            <button className="w-full bg-indigo-500 py-2 rounded font-semibold">Reset password</button>
          </form>
        )}

        {step === 3 && (
          <div>
            <div className="text-green-400 mb-4">{info}</div>
            <div className="mt-4 text-sm">
              <Link to="/signin" className="text-sky-300 underline">Sign in</Link>
            </div>
          </div>
        )}

        {info && step !== 3 && <div className="text-sky-200 mt-4">{info}</div>}
      </div>
    </div>
  )
}
