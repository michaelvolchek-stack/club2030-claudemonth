'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function addSubTask(taskId: string, title: string) {
  const count = await prisma.subTask.count({ where: { taskId } })
  const sub = await prisma.subTask.create({
    data: { taskId, title, order: count },
  })
  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
  return sub
}

export async function toggleSubTask(id: string) {
  const sub = await prisma.subTask.findUniqueOrThrow({ where: { id } })
  const updated = await prisma.subTask.update({
    where: { id },
    data: { completed: !sub.completed },
  })
  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
  return updated
}

export async function reorderSubTasks(taskId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.subTask.update({ where: { id }, data: { order: index } })
    )
  )
  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
}

export async function deleteSubTask(id: string) {
  await prisma.subTask.delete({ where: { id } })
  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
}
