import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respondToMessage } from '@/lib/whatsapp/respond'
import { greenApiConfig, sendWhatsAppMessage } from '@/lib/whatsapp/client'

export const dynamic = 'force-dynamic'

// Shape of the Green API "incomingMessageReceived" webhook payload (subset).
// Docs: https://green-api.com/en/docs/api/receiving/notifications-format/
interface GreenNotification {
  typeWebhook?: string
  senderData?: { chatId?: string; sender?: string; senderName?: string }
  messageData?: {
    typeMessage?: string
    textMessageData?: { textMessage?: string }
    extendedTextMessageData?: { text?: string }
  }
}

function extractText(n: GreenNotification): string | null {
  const md = n.messageData
  if (!md) return null
  return md.textMessageData?.textMessage ?? md.extendedTextMessageData?.text ?? null
}

export async function POST(req: Request) {
  // Security layer 1 — shared secret token appended to the webhook URL
  // (?token=...). Required: if WHATSAPP_WEBHOOK_TOKEN is not set the endpoint
  // refuses all traffic, so a misconfigured deploy can't accept unauthenticated
  // webhooks.
  const expected = process.env.WHATSAPP_WEBHOOK_TOKEN
  if (!expected) {
    console.error('WHATSAPP_WEBHOOK_TOKEN is not set — rejecting webhook request')
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }
  const token = new URL(req.url).searchParams.get('token')
  if (token !== expected) return NextResponse.json({ ok: false }, { status: 401 })

  let payload: GreenNotification
  try {
    payload = (await req.json()) as GreenNotification
  } catch {
    return NextResponse.json({ ok: true, ignored: 'bad_json' })
  }

  // Only act on inbound text messages.
  if (payload.typeWebhook !== 'incomingMessageReceived') {
    return NextResponse.json({ ok: true, ignored: payload.typeWebhook ?? 'unknown' })
  }

  const chatId = payload.senderData?.chatId ?? ''
  const text = extractText(payload)
  const { chatId: ownerChatId } = greenApiConfig()

  // Security layer 2 — sender verification. Single-user app: only respond to
  // the configured owner number, so even a valid-token webhook carrying someone
  // else's message is ignored.
  if (!ownerChatId || chatId !== ownerChatId) {
    return NextResponse.json({ ok: true, ignored: 'not_owner' })
  }
  if (!text) return NextResponse.json({ ok: true, ignored: 'no_text' })

  // Log the inbound message.
  const incoming = await prisma.whatsAppIncoming.create({
    data: { fromNumber: chatId, body: text },
  })

  let reply: string
  try {
    reply = await respondToMessage(text)
  } catch (err) {
    console.error('WhatsApp command failed:', err)
    reply = 'אירעה שגיאה בעיבוד ההודעה. נסו שוב או שלחו "עזרה".'
  }

  await prisma.whatsAppIncoming.update({
    where: { id: incoming.id },
    data: { processedAt: new Date() },
  })

  try {
    await sendWhatsAppMessage(chatId, reply)
  } catch (err) {
    console.error('WhatsApp reply failed:', err)
  }

  return NextResponse.json({ ok: true })
}
