// Green API (WhatsApp) HTTP client — single-user setup.
// Docs: https://green-api.com/en/docs/api/sending/SendMessage/
//
// Config lives in .env (never committed):
//   GREEN_API_INSTANCE   – idInstance from the Green API console
//   GREEN_API_TOKEN      – apiTokenInstance from the console
//   GREEN_API_BASE_URL   – optional, defaults to https://api.green-api.com
//   MY_WHATSAPP_CHAT_ID  – the owner chat id, e.g. 972501234567@c.us

const DEFAULT_BASE = 'https://api.green-api.com'

export interface GreenApiConfig {
  instance: string | undefined
  token: string | undefined
  chatId: string | undefined
  base: string
}

export function greenApiConfig(): GreenApiConfig {
  return {
    instance: process.env.GREEN_API_INSTANCE,
    token: process.env.GREEN_API_TOKEN,
    chatId: process.env.MY_WHATSAPP_CHAT_ID,
    base: process.env.GREEN_API_BASE_URL || DEFAULT_BASE,
  }
}

/** True when the instance + token are present (enough to send messages). */
export function isGreenApiConfigured(): boolean {
  const { instance, token } = greenApiConfig()
  return Boolean(instance && token)
}

/**
 * Send a WhatsApp text message via Green API.
 * @returns the Green API message id (idMessage), or '' if not returned.
 */
export async function sendWhatsAppMessage(chatId: string, message: string): Promise<string> {
  const { instance, token, base } = greenApiConfig()
  if (!instance || !token) {
    throw new Error('Green API not configured (GREEN_API_INSTANCE / GREEN_API_TOKEN missing)')
  }

  const url = `${base}/waInstance${instance}/sendMessage/${token}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Green API sendMessage failed: ${res.status} ${body}`)
  }

  const data = (await res.json().catch(() => ({}))) as { idMessage?: string }
  return data.idMessage ?? ''
}
