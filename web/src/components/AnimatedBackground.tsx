import React from 'react'

export default function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg className="absolute left-1/4 top-0 w-[640px] h-[640px] bg-clip-padding bg-cover bg-no-repeat bg-center opacity-60 transform-gpu animate-blobRotate"
           viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(300,300)">
          <defs>
            <linearGradient id="g1" x1="0" x2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <circle r="260" fill="url(#g1)" />
        </g>
      </svg>

      <svg className="absolute right-0 bottom-0 w-[520px] h-[520px] opacity-40 transform-gpu animate-float"
           viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g2" x1="0" x2="1">
            <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <g transform="translate(300,300)">
          <ellipse rx="220" ry="220" fill="url(#g2)" />
        </g>
      </svg>
    </div>
  )
}
