import React from 'react'

export default function AnimatedLogo({ size = 48 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div className="w-12 h-12 rounded-2xl brand-gradient flex items-center justify-center shadow-lg animate-pulseScale">
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 26h14a6 6 0 0 0 .8-11.95A8.8 8.8 0 0 0 9.46 13 6.2 6.2 0 0 0 11 26z" fill="white" opacity="0.95" />
          <path d="M18 11v11" stroke="#5A3F99" strokeWidth="2.4" strokeLinecap="round" />
          <path d="m14.8 19.6 3.2 3.2 3.2-3.2" stroke="#5A3F99" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="leading-tight hidden sm:block">
        <div className="text-base font-extrabold tracking-wide">HOME SERVER</div>
        <div className="text-[10px] opacity-70 tracking-[0.3em]">SLOGAN HERE</div>
      </div>
    </div>
  )
}
