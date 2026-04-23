'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const token = localStorage.getItem('token')
    router.replace(token ? '/dashboard' : '/auth')
  }, [router])
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-jade border-t-transparent rounded-full animate-spin" />
  </div>
}
