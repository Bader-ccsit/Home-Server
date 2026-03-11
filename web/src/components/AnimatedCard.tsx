import React from 'react'

export default function AnimatedCard({ children, className = '' }: any) {
  return (
    <div className={`card card-entrance rounded-3xl w-full ${className}`}>
      {children}
    </div>
  )
}
