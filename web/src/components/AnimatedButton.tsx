import React from 'react'

export default function AnimatedButton({ children, className = '', ...props }: any) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-semibold transition duration-300 transform hover:-translate-y-0.5 active:scale-[0.98] shadow-lg text-white border border-white/30 bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 hover:brightness-110 ${className}`}
    >
      {children}
    </button>
  )
}
