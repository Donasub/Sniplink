import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sniplink — URL Shortener & QR Generator',
  description: 'Free URL shortener and QR code generator. Shorten links, track clicks, generate scannable QR codes.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
