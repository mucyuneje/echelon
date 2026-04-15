'use client'
import './globals.css'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { Toaster } from 'react-hot-toast'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Provider store={store}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1A1F2E', color: '#E8EAF0', border: '1px solid rgba(255,255,255,0.08)', fontSize: '14px' },
              success: { iconTheme: { primary: '#00C896', secondary: '#080C14' } },
              error: { iconTheme: { primary: '#E53E3E', secondary: '#080C14' } },
            }}
          />
        </Provider>
      </body>
    </html>
  )
}
