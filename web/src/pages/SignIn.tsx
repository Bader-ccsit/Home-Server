import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

export default function SignIn() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
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
      setError(err?.response?.data?.message || 'Sign in failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-900 to-indigo-900 text-white">
      <form onSubmit={submit} className="bg-white/5 backdrop-blur-md p-8 rounded-xl w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4">Sign in</h1>
  <label className="block mb-2">Email or Username</label>
  <input className="w-full p-2 rounded mb-4 text-black" value={identifier} onChange={e => setIdentifier(e.target.value)} />
        <label className="block mb-2">Password</label>
        <input type="password" className="w-full p-2 rounded mb-4 text-black" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <div className="text-rose-400 mb-2">{error}</div>}
        <button className="w-full bg-indigo-500 py-2 rounded font-semibold">Sign in</button>
        <div className="mt-4 text-sm">
          Don't have an account? <Link to="/signup" className="text-sky-300 underline">Sign up</Link>
          <div className="mt-2">
            <Link to="/reset" className="text-sky-300 underline">Forgot password?</Link>
          </div>
        </div>
      </form>
    </div>
  )
}
