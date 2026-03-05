import React from 'react'

export default function AnimatedCard({ children, className = '' }: any) {
  return (
    <div className={`card card-entrance p-6 rounded-2xl w-full max-w-xl mx-auto ${className}`}>
      {children}
    </div>
  )
}
