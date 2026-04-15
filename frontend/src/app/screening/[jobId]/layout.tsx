'use client'
import Sidebar from '@/components/layout/Sidebar'
export default function ScreeningLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 ml-16 lg:ml-56 min-h-screen">{children}</main>
    </div>
  )
}
