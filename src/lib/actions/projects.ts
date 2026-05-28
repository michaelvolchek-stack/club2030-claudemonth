'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { ProjectWithChildren } from '@/types'

export async function createProject(data: {
  name: string
  color?: string
  parentId?: string
}) {
  const project = await prisma.project.create({ data })
  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
  return project
}

export async function updateProject(
  id: string,
  data: { name?: string; color?: string; parentId?: string | null }
) {
  const project = await prisma.project.update({ where: { id }, data })
  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
  return project
}

export async function deleteProject(id: string) {
  // Unlink tasks before deleting
  await prisma.task.updateMany({ where: { projectId: id }, data: { projectId: null } })
  await prisma.project.delete({ where: { id } })
  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
}

export async function getProjectTree(): Promise<ProjectWithChildren[]> {
  const all = await prisma.project.findMany({
    include: { _count: { select: { tasks: true } } },
    orderBy: { name: 'asc' },
  })

  // Build tree
  const map = new Map<string, ProjectWithChildren>()
  all.forEach(p =>
    map.set(p.id, { ...p, children: [] })
  )

  const roots: ProjectWithChildren[] = []
  map.forEach(p => {
    if (p.parentId && map.has(p.parentId)) {
      map.get(p.parentId)!.children.push(p)
    } else {
      roots.push(p)
    }
  })

  return roots
}
