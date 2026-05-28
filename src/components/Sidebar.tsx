'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ProjectWithChildren } from '@/types'
import { ProjectTree } from './ProjectTree'
import { CalendarDays, CalendarRange, List, Search } from 'lucide-react'

interface SidebarProps {
  projects: ProjectWithChildren[]
}

const NAV_ITEMS = [
  { href: '/today', label: 'היום', icon: CalendarDays },
  { href: '/week', label: 'השבוע', icon: CalendarRange },
  { href: '/all', label: 'הכל', icon: List },
  { href: '/search', label: 'חיפוש', icon: Search },
]

export function Sidebar({ projects }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 border-l bg-muted/30 flex flex-col h-full">
      {/* Logo / App name */}
      <div className="px-4 py-5 border-b">
        <h1 className="text-base font-semibold tracking-tight">📋 המשימות שלי</h1>
      </div>

      {/* Main nav */}
      <nav className="px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mx-4 my-2 border-t" />

      {/* Projects */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          פרויקטים
        </p>
        <ProjectTree projects={projects} currentPath={pathname} />
      </div>
    </aside>
  )
}
