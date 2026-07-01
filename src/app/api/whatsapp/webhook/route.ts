import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleIncomingMessage } from '@/lib/whatsapp/commands'
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
  // Optional shared secret appended to the webhook URL (?token=...).
  const expected = process.env.WHATSAPP_WEBHOOK_TOKEN
  if (expected) {
    const token = new URL(req.url).searchParams.get('token')
    if (token !== expected) return NextResponse.json({ ok: false }, { status: 401 })
  }

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

  // Single-user app: only respond to the configured owner number.
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
    reply = await handleIncomingMessage(text)
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
