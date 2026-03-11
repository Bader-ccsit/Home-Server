import React from 'react'

export default function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-36 -top-32 w-[560px] h-[560px] rounded-full bg-cyan-400/25 dark:bg-cyan-400/18 blur-[90px] animate-float" />
      <div className="absolute right-[-180px] top-[18%] w-[620px] h-[620px] rounded-full bg-violet-500/20 dark:bg-violet-500/25 blur-[110px] animate-blobRotate" />
      <div className="absolute left-[22%] bottom-[-220px] w-[680px] h-[680px] rounded-full bg-blue-500/20 dark:bg-blue-500/22 blur-[120px] animate-float" />
      <svg className="absolute inset-0 w-full h-full opacity-[0.16] dark:opacity-[0.09]" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.3" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="1200" height="800" fill="url(#dots)" />
      </svg>
    </div>
  )
}
