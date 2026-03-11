import React from 'react'
import Header from './Header'
import AnimatedBackground from './AnimatedBackground'

export default function Layout({ children }: any) {
  return (
    <div className="app-shell min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 px-3 pb-4 sm:px-4 sm:pb-6 lg:px-6 lg:pb-8">
          <div className="w-full max-w-[1180px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
