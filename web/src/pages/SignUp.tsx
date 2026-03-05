import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

export default function SignUp() {
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
      setError('Password must be at least 6 characters and contain a number or special character')
      return
    }
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/auth/signup`, { username, email, password })
      navigate('/activate', { state: { email } })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Sign up failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-900 to-indigo-900 text-white">
      <form onSubmit={submit} className="bg-white/5 backdrop-blur-md p-8 rounded-xl w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4">Sign up</h1>
        <label className="block mb-2">Username</label>
        <input className="w-full p-2 rounded mb-4 text-black" value={username} onChange={e => setUsername(e.target.value)} />
        <label className="block mb-2">Email</label>
        <input className="w-full p-2 rounded mb-4 text-black" value={email} onChange={e => setEmail(e.target.value)} />
        <label className="block mb-2">Password</label>
  <input type="password" className="w-full p-2 rounded mb-2 text-black" value={password} onChange={e => setPassword(e.target.value)} />
  <div className="text-sm text-sky-200 mb-4">Password must be at least 6 characters and contain a number or special character.</div>
        {error && <div className="text-rose-400 mb-2">{error}</div>}
        <button className="w-full bg-indigo-500 py-2 rounded font-semibold">Create account</button>
        <div className="mt-4 text-sm">
          Already have an account? <Link to="/signin" className="text-sky-300 underline">Sign in</Link>
        </div>
      </form>
    </div>
  )
}
