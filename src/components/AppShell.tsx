'use client'

import { Sidebar } from './Sidebar'
import { ProjectWithChildren } from '@/types'

interface AppShellProps {
  children: React.ReactNode
  projects: ProjectWithChildren[]
}

export function AppShell({ children, projects }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar projects={projects} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
