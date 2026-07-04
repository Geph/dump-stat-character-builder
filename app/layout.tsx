import type { Metadata, Viewport } from 'next'
import { Geist_Mono } from 'next/font/google'
import { AppThemeProvider } from '@/components/providers/app-theme-provider'
import { StaticDataProvider } from '@/components/providers/static-data-provider'
import './globals.css'
import '../styles/print.css'

// Solbera fonts are loaded via @font-face in globals.css
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: 'Dump Stat - 5E Compatible Character Builder',
  description:
    'Character builder and compendium for tabletop RPGs. Compatible with fifth edition. Bundled SRD 5.2.1 content and custom homebrew support.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#f0e8d8',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" data-theme="parchment" suppressHydrationWarning>
      <body className={`${geistMono.variable} font-sans antialiased`}>
        <AppThemeProvider>
          <StaticDataProvider>{children}</StaticDataProvider>
        </AppThemeProvider>
      </body>
    </html>
  )
}
