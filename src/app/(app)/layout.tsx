import { getProjectTree } from '@/lib/actions/projects'
import { AppShell } from '@/components/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const projects = await getProjectTree()
  return <AppShell projects={projects}>{children}</AppShell>
}
