import telebot
from telebot import types
import random
from supabase import create_client, Client
import os

# بيانات البوت و Supabase
TOKEN = "8694896406:AAEspC9Hr_sYfdPc9AANB1mqO3sQ94GXELI"
SUPABASE_URL = "https://ufaqfqcbovgkpqlujnxo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmYXFmcWNib3Zna3BxbHVqbnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTc1MTIsImV4cCI6MjA5Mzk5MzUxMn0.yWOTOCQN_3VM8FY2-vag_Ul6f_v0mLD365O4NTKr8p0"

bot = telebot.TeleBot(TOKEN)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("🚀 Garage Bot is starting...")

@bot.message_handler(commands=['start'])
def start(message):
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, one_time_keyboard=True)
    button = types.KeyboardButton("📲 الحصول على رمز الدخول", request_contact=True)
    markup.add(button)
    
    bot.send_message(
        message.chat.id, 
        "🛡️ مرحباً بك في Garage.\n\nيرجى الضغط على الزر أدناه للحصول على رمز الدخول الخاص بك.", 
        reply_markup=markup
    )

@bot.message_handler(content_types=['contact'])
def contact_handler(message):
    if message.contact.user_id != message.from_user.id:
        bot.send_message(message.chat.id, "⚠️ عذراً، يجب مشاركة رقم هاتفك الشخصي.")
        return

    phone = message.contact.phone_number.replace('+', '')
    otp = str(random.randint(100000, 999999))
    
    print(f"Generating OTP {otp} for phone {phone}")
    
    try:
        # تحديث الجلسة في Supabase
        data = supabase.table("auth_sessions").upsert({
            "phone": phone,
            "otp_code": otp,
            "status": "awaiting_otp"
        }).execute()
        
        bot.send_message(
            message.chat.id, 
            f"✅ تم استلام رقمك بنجاح.\n\n🔑 رمز التحقق الخاص بك لـ Garage هو:\n\n {otp} \n\n يرجى إدخاله في التطبيق لإتمام العملية."
        )
    except Exception as e:
        print(f"Error updating Supabase: {e}")
        bot.send_message(message.chat.id, "❌ حدث خطأ أثناء إنشاء الرمز، يرجى المحاولة لاحقاً.")

if __name__ == "__main__":
    bot.infinity_polling()
