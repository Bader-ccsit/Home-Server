import React from 'react'

export default function AnimatedButton({ children, className = '', ...props }: any) {
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full font-semibold transition transform hover:-translate-y-0.5 active:scale-95 shadow-md bg-gradient-to-r from-accent-500 to-sky-400 ${className}`}>
      {children}
    </button>
  )
}
