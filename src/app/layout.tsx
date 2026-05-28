import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'ניהול משימות',
  description: 'מערכת ניהול משימות אישית',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl" className={inter.variable}>
      <body className="font-sans antialiased bg-background text-foreground">
        <TooltipProvider>
          {children}
          <Toaster position="bottom-left" richColors />
        </TooltipProvider>
      </body>
    </html>
  )
}
