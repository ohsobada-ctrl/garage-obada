// supabase/functions/telegram-bot/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '8694896406:AAEspC9Hr_sYfdPc9AANB1mqO3sQ94GXELI'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface TelegramPayload {
  message?: {
    chat?: { id: number };
    from?: { id: number; first_name?: string };
    text?: string;
    contact?: { 
      phone_number: string;
      user_id?: number;
    };
  };
}

Deno.serve(async (req: Request) => {
  try {
    // التحقق من أن الطلب POST
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const payload: TelegramPayload = await req.json()
    console.log('Received Payload:', JSON.stringify(payload))

    const chatId = payload.message?.chat?.id
    const text = payload.message?.text
    const contact = payload.message?.contact
    const fromId = payload.message?.from?.id

    if (!chatId) {
      console.log('No Chat ID found in payload')
      return new Response(JSON.stringify({ ok: true, message: 'No chat id' }), { status: 200 })
    }

    // 1. توليد رمز OTP عشوائي
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // 2. التعامل مع مشاركة رقم الهاتف
    if (contact) {
      console.log('Processing contact sharing...')
      const contactUserId = contact.user_id

      // شرط الأمان: التأكد أن الرقم يخص نفس الشخص الذي أرسله
      if (contactUserId && fromId && fromId !== contactUserId) {
        console.warn('Security Warning: User ID mismatch')
        await sendTelegramMessage(chatId, "⚠️ عذراً، يجب مشاركة رقم هاتفك الشخصي المرتبط بهذا الحساب.")
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }

      let phone = contact.phone_number.replace(/\D/g, '')
      console.log(`Verified phone: ${phone}`)

      const { error } = await supabase
        .from('auth_sessions')
        .upsert({ 
          phone: phone,
          otp_code: otp,
          status: 'awaiting_otp',
          updated_at: new Date().toISOString()
        }, { onConflict: 'phone' })

      if (error) {
        console.error('Supabase Error:', error)
        throw error
      }

      await sendTelegramMessage(chatId, `✅ تم استلام رقمك بنجاح.\n\n🔑 رمز التحقق الخاص بك لـ Garage هو:\n\n ${otp} \n\n يرجى إدخاله في التطبيق لإتمام العملية.`)
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    // 3. رسالة البداية
    if (text?.startsWith('/start')) {
      console.log('Handling /start command')
      await sendTelegramMessage(chatId, "🛡️ مرحباً بك في Garage.\n\nيرجى الضغط على الزر أدناه للحصول على رمز الدخول الخاص بك.", {
        keyboard: [[{ text: "📲 الحصول على رمز الدخول", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('Final Error Catch:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        reply_markup: replyMarkup
      })
    })
    const result = await res.json()
    console.log('Telegram API Response:', JSON.stringify(result))
  } catch (error) {
    console.error('Failed to send Telegram message:', error)
  }
}
