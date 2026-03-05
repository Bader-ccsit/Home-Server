import React from 'react'
import Header from './Header'
import AnimatedBackground from './AnimatedBackground'

export default function Layout({ children }: any) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-sky-900 to-indigo-900 dark:from-slate-900 dark:to-slate-800 text-white">
      <AnimatedBackground />
      <Header />
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}
