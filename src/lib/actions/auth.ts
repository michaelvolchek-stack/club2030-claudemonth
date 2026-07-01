'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  credentialsValid,
} from '@/lib/auth'

export type LoginState = { error?: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!credentialsValid(username, password)) {
    return { error: 'שם משתמש או סיסמה שגויים' }
  }

  cookies().set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })

  // Must be called outside try/catch — redirect() throws NEXT_REDIRECT.
  redirect('/today')
}

export async function logout() {
  cookies().delete(SESSION_COOKIE)
  redirect('/login')
}
