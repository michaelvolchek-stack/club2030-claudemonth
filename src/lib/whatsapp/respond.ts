// Single entry point for handling an inbound WhatsApp message. Routes to the
// Claude natural-language path (ai.ts) when ANTHROPIC_API_KEY is configured,
// and falls back to the keyword parser (commands.ts) otherwise — or if the AI
// call fails at runtime.

import { handleIncomingMessage } from './commands'
import { interpretAndAct, isAiConfigured } from './ai'

export async function respondToMessage(text: string): Promise<string> {
  const body = text.trim()
  if (!body) return 'לא קיבלתי טקסט. שלחו "עזרה" לרשימת הפקודות.'

  if (isAiConfigured()) {
    try {
      return await interpretAndAct(body)
    } catch (err) {
      console.error('AI interpretation failed, falling back to keywords:', err)
    }
  }

  return handleIncomingMessage(body)
}
