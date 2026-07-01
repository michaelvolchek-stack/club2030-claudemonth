import { NextResponse } from 'next/server'
import { buildDailyDigest } from '@/lib/whatsapp/digest'
import { greenApiConfig, isGreenApiConfigured, sendWhatsAppMessage } from '@/lib/whatsapp/client'

export const dynamic = 'force-dynamic'

// Secured endpoint hit by an external cron once a day to push the daily digest.
// Authorize via ?secret=<CRON_SECRET> or `Authorization: Bearer <CRON_SECRET>`.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const fromQuery = new URL(req.url).searchParams.get('secret')
  const auth = req.headers.get('authorization')
  const fromHeader = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  return fromQuery === secret || fromHeader === secret
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!isGreenApiConfigured()) {
    return NextResponse.json({ error: 'green_api_not_configured' }, { status: 503 })
  }
  const { chatId } = greenApiConfig()
  if (!chatId) {
    return NextResponse.json({ error: 'MY_WHATSAPP_CHAT_ID missing' }, { status: 503 })
  }

  const message = await buildDailyDigest()
  const idMessage = await sendWhatsAppMessage(chatId, message)
  return NextResponse.json({ ok: true, idMessage })
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}
