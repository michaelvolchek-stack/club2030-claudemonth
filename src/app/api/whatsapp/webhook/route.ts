import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respondToMessage } from '@/lib/whatsapp/respond'
import { greenApiConfig, sendWhatsAppMessage } from '@/lib/whatsapp/client'

export const dynamic = 'force-dynamic'

// Shape of the Green API webhook payload (subset).
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

// Webhook types we act on:
//   incomingMessageReceived  – a message sent *to* the instance (dedicated-number
//                              setups: the owner texts the bot from their phone).
//   outgoingMessageReceived  – a message the owner typed *on the device* in their
//                              own "Message Yourself" chat (single-number setups,
//                              where the instance IS the owner's number).
// We deliberately DO NOT handle `outgoingAPIMessageReceived` — those are the
// bot's own replies (sent via the API); processing them would create a loop.
const HANDLED_TYPES = new Set(['incomingMessageReceived', 'outgoingMessageReceived'])

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

  // Only act on user-authored text messages (incoming, or self-chat outgoing).
  // Ignoring outgoingAPIMessageReceived here is what prevents a reply loop.
  if (!HANDLED_TYPES.has(payload.typeWebhook ?? '')) {
    return NextResponse.json({ ok: true, ignored: payload.typeWebhook ?? 'unknown' })
  }

  const chatId = payload.senderData?.chatId ?? ''
  const text = extractText(payload)
  const { chatId: ownerChatId } = greenApiConfig()

  // Security layer 2 — sender/chat verification. Single-user app: only act on
  // the configured owner number. For incoming this is the sender; for self-chat
  // outgoing this is the (self) recipient — both surface as senderData.chatId.
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
