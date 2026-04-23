'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function ProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timers = useRef<NodeJS.Timeout[]>([])

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  useEffect(() => {
    clear()
    setVisible(true)
    setProgress(0)

    const t1 = setTimeout(() => setProgress(30),  50)
    const t2 = setTimeout(() => setProgress(60),  200)
    const t3 = setTimeout(() => setProgress(80),  400)
    const t4 = setTimeout(() => setProgress(95),  600)
    const t5 = setTimeout(() => {
      setProgress(100)
      const t6 = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
      timers.current.push(t6)
    }, 800)

    timers.current = [t1, t2, t3, t4, t5]
    return clear
  }, [pathname, searchParams])

  if (!visible) return null

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, height:3, zIndex:99999, pointerEvents:'none' }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #2563EB, #3B82F6, #06B6D4)',
        transition: progress === 100
          ? 'width 0.15s ease, opacity 0.3s ease 0.15s'
          : 'width 0.4s cubic-bezier(.4,0,.2,1)',
        opacity: progress === 100 ? 0 : 1,
        boxShadow: '0 0 8px rgba(59,130,246,0.6)',
        borderRadius: '0 2px 2px 0',
      }} />
    </div>
  )
}

export default function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBar />
    </Suspense>
  )
}