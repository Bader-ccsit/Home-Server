import React from 'react'

export default function AnimatedLogo({ size = 48 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-sky-400 flex items-center justify-center shadow-lg animate-pulseScale">
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15 8H9L12 2Z" fill="white" opacity="0.9" />
          <circle cx="12" cy="14" r="6" fill="rgba(255,255,255,0.12)" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-lg font-bold">My Home</div>
        <div className="text-xs opacity-70">Server</div>
      </div>
    </div>
  )
}
