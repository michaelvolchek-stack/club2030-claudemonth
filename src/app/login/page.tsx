import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (await verifySessionToken(token)) redirect('/today')

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-2xl">📋</div>
          <h1 className="mt-2 text-lg font-semibold tracking-tight">המשימות שלי</h1>
          <p className="mt-1 text-sm text-muted-foreground">התחברות למערכת</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
