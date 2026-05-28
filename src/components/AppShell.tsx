'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { ProjectWithChildren } from '@/types'
import { Menu } from 'lucide-react'

interface AppShellProps {
  children: React.ReactNode
  projects: ProjectWithChildren[]
}

export function AppShell({ children, projects }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // N → focus Quick Add (when not already in an input/textarea)
      if (
        e.key === 'n' &&
        !e.metaKey && !e.ctrlKey && !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('[data-quickadd]')
        input?.focus()
      }

      // Escape → close mobile sidebar
      if (e.key === 'Escape') setSidebarOpen(false)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on md+, slide-in on mobile */}
      <div className={[
        'fixed inset-y-0 right-0 z-40 transition-transform duration-200 md:static md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
      ].join(' ')}>
        <Sidebar projects={projects} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 bg-background z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">📋 המשימות שלי</span>
        </div>

        {children}
      </main>
    </div>
  )
}
