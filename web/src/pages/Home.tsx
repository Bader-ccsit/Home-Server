import React from 'react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-900 to-indigo-900 text-white p-6">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Home Server</h1>
        <div className="flex items-center gap-4">
          <div>Welcome back</div>
          <button
            onClick={() => { localStorage.removeItem('token'); window.location.href = '/signin' }}
            className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      <main>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white/5 rounded-lg p-6">Cloud Drive (MinIO)</div>
          <div className="bg-white/5 rounded-lg p-6">Other Service</div>
        </section>
      </main>
    </div>
  )
}
