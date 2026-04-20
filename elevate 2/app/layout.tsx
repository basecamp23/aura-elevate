import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Elevate — Aura Aesthetica',
  description: 'Lead intelligence & revenue attribution',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
