'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function getTags() {
  return prisma.tag.findMany({ orderBy: { name: 'asc' } })
}

export async function createTag(data: { name: string; color?: string }) {
  const tag = await prisma.tag.create({ data })
  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
  return tag
}

export async function updateTag(id: string, data: { name?: string; color?: string }) {
  const tag = await prisma.tag.update({ where: { id }, data })
  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
  return tag
}

export async function deleteTag(id: string) {
  await prisma.tag.delete({ where: { id } })
  revalidatePath('/all'); revalidatePath('/today'); revalidatePath('/week')
}
