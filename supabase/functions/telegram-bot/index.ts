// supabase/functions/telegram-bot/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const BOT_TOKEN = '8694896406:AAFM229p4Xo0dq6mfYnbOTgGWj8cmMbDNE0'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface TelegramPayload {
  message?: {
    chat?: { id: number };
    text?: string;
    contact?: { phone_number: string };
  };
}

Deno.serve(async (req: Request) => {
  try {
    const payload: TelegramPayload = await req.json()
    const chatId = payload.message?.chat?.id
    const text = payload.message?.text
    const contact = payload.message?.contact

    if (!chatId) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    // 1. التعامل مع مشاركة رقم الهاتف
    if (contact) {
      const phone = contact.phone_number.replace('+', '')
      
      const { error } = await supabase
        .from('auth_sessions')
        .update({ status: 'verified' })
        .eq('phone', phone)
        .order('created_at', { ascending: false })

      if (error) throw error

      await sendTelegramMessage(chatId, "✅ تم تأكيد هويتك بنجاح! ارجع للتطبيق الآن.")
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    // 2. رسالة البداية
    if (text?.startsWith('/start')) {
      await sendTelegramMessage(chatId, "🛡️ مرحباً بك في مرآب أوباما.\n\nيرجى الضغط على الزر أدناه لتأكيد رقم هاتفك والدخول للتطبيق بأمان.", {
        keyboard: [[{ text: "📲 تأكيد هويتي الآن", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: replyMarkup
    })
  })
}
