import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respondToMessage } from '@/lib/whatsapp/respond'
import { greenApiConfig, sendWhatsAppMessage } from '@/lib/whatsapp/client'

export const dynamic = 'force-dynamic'

// Shape of the Green API webhook payload (subset).
// Docs: https://green-api.com/en/docs/api/receiving/notifications-format/
interface GreenNotification {
  typeWebhook?: string
  quotaData?: { status?: string; description?: string }
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
    if (payload.typeWebhook === 'quotaExceeded') {
      // Green API free plan: the monthly correspondents quota was exceeded, so
      // real messages are replaced by this notification and the two-way chat
      // silently dies. Surface it loudly in the Vercel logs.
      console.warn(
        `whatsapp webhook: quotaExceeded — ${payload.quotaData?.description ?? 'no description'}`
      )
    } else {
      console.log(`whatsapp webhook: ignoring typeWebhook=${payload.typeWebhook ?? 'unknown'}`)
    }
    return NextResponse.json({ ok: true, ignored: payload.typeWebhook ?? 'unknown' })
  }

  const chatId = payload.senderData?.chatId ?? ''
  const sender = payload.senderData?.sender ?? ''
  const text = extractText(payload)
  const { chatId: ownerChatId } = greenApiConfig()
  const groupChatId = process.env.WHATSAPP_GROUP_CHAT_ID

  // Security layer 2 — sender/chat verification. Single-user app, two supported
  // topologies (both scope strictly to the owner):
  //   (a) Direct chat — senderData.chatId is the owner's own number (@c.us).
  //       Used by dedicated-number setups and by incoming messages.
  //   (b) Dedicated group (WHATSAPP_GROUP_CHAT_ID) whose only human is the owner
  //       — senderData.chatId is the group (@g.us) and senderData.sender is the
  //       owner. This is how a SINGLE number does two-way chat: WhatsApp's
  //       "Message Yourself" chat never fires a webhook, but a real group the
  //       owner types in does (outgoingMessageReceived). The bot replies into
  //       the same group; its own API replies arrive as
  //       outgoingAPIMessageReceived and are filtered above, so no loop.
  const isOwnerDirect = Boolean(ownerChatId) && chatId === ownerChatId
  // Group path: an outgoingMessageReceived is by definition a message the owner's
  // own account sent from a device, so membership in the dedicated group is proof
  // enough of authorship — we do NOT require sender===owner (WhatsApp groups may
  // report the sender as a privacy id / @lid rather than the @c.us number, which
  // would wrongly reject the owner's own message). For a group *incoming* message
  // (someone else posting) we still require the sender to be the owner.
  const isOwnerGroup =
    Boolean(groupChatId) &&
    chatId === groupChatId &&
    (payload.typeWebhook === 'outgoingMessageReceived' || sender === ownerChatId)
  if (!isOwnerDirect && !isOwnerGroup) {
    // Not secret — helps read the group id from logs during first-time setup.
    console.log('WhatsApp ignored (not_owner):', {
      chatId,
      sender,
      type: payload.typeWebhook,
    })
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
