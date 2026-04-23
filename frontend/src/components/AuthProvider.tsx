'use client'
import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter, usePathname } from 'next/navigation'
import { loadMeThunk } from '@/store/slices/authSlice'
import { AppDispatch, RootState } from '@/store'

const PUBLIC_PATHS = ['/auth']

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()
  const router   = useRouter()
  const pathname = usePathname()
  const { user, loading } = useSelector((s: RootState) => s.auth)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const token    = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

    if (!token) {
      if (!isPublic) router.replace('/auth')
      return
    }

    // Token exists — restore session
    if (!user) {
      dispatch(loadMeThunk()).unwrap()
        .then(() => {
          // If on auth page, bounce into app
          if (isPublic) router.replace('/dashboard')
        })
        .catch(() => {
          localStorage.removeItem('token')
          if (!isPublic) router.replace('/auth')
        })
    } else if (isPublic) {
      router.replace('/dashboard')
    }
  }, [])

  return <>{children}</>
}
