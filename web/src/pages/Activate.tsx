import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'

export default function Activate() {
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
      await axios.post(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/auth/verify-otp`, { email, otp })
      navigate('/home')
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Activation failed')
    }
  }

  async function resend() {
    setMessage('')
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/auth/resend-otp`, { email })
      setMessage('OTP resent')
      setCanResend(false)
      setTimeout(() => setCanResend(true), Number(import.meta.env.VITE_OTP_RESEND_BUFFER || 60000))
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Resend failed')
    }
  }

  useEffect(() => {
    // ensure resend state is derived from env on mount
    setCanResend(true)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-900 to-indigo-900 text-white">
      <form onSubmit={submit} className="bg-white/5 backdrop-blur-md p-8 rounded-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Activate your account</h1>
        <label className="block mb-2">Email</label>
        <input className="w-full p-2 rounded mb-4 text-black" value={email} onChange={e => setEmail(e.target.value)} />
        <label className="block mb-2">4-digit OTP</label>
        <input className="w-full p-2 rounded mb-4 text-black" value={otp} onChange={e => setOtp(e.target.value)} />
        {message && <div className="text-rose-400 mb-2">{message}</div>}
        <button className="w-full bg-indigo-500 py-2 rounded font-semibold">Activate</button>
        <div className="mt-4 text-sm">
          <button type="button" onClick={resend} disabled={!canResend} className="underline text-sky-300">Resend OTP</button>
        </div>
      </form>
    </div>
  )
}
