import os
import telebot
from telebot import types
import random
import requests
import json

# بيانات البوت و Supabase
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8694896406:AAEspC9Hr_sYfdPc9AANB1mqO3sQ94GXELI")
SUPABASE_URL = "https://ufaqfqcbovgkpqlujnxo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmYXFmcWNib3Zna3BxbHVqbnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTc1MTIsImV4cCI6MjA5Mzk5MzUxMn0.yWOTOCQN_3VM8FY2-vag_Ul6f_v0mLD365O4NTKr8p0"

bot = telebot.TeleBot(TOKEN)

def check_pending_session(phone):
    """التحقق مما إذا كان هذا الرقم قد بدأ عملية التحقق من التطبيق فعلاً"""
    url = f"{SUPABASE_URL}/rest/v1/auth_sessions?phone=eq.{phone}&status=eq.pending"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        return len(data) > 0
    except Exception as e:
        print(f"❌ Error checking session: {e}")
        return False

def upsert_to_supabase(phone, otp):
    """تحديث الجلسة بالرمز الجديد وتغيير الحالة إلى انتظار الإدخال"""
    url = f"{SUPABASE_URL}/rest/v1/auth_sessions?on_conflict=phone"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    data = {
        "phone": phone,
        "otp_code": otp,
        "status": "awaiting_otp"
    }
    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"❌ Error updating Supabase: {e}")
        return False

print("🚀 Garage Bot (Secure Edition) is starting...")

@bot.message_handler(commands=['start'])
def start(message):
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, one_time_keyboard=True)
    button = types.KeyboardButton("📲 مشاركة رقم الهاتف للتحقق", request_contact=True)
    markup.add(button)
    
    bot.send_message(
        message.chat.id, 
        "🛡️ مرحباً بك في Garage.\n\nمن أجل تأمين حسابك، يرجى الضغط على الزر أدناه لمشاركة رقم هاتفك وإصدار رمز الدخول الخاص بك.", 
        reply_markup=markup
    )

@bot.message_handler(content_types=['contact'])
def contact_handler(message):
    # التأكد أن الرقم يخص نفس الشخص صاحب الحساب
    if message.contact.user_id != message.from_user.id:
        bot.send_message(message.chat.id, "⚠️ عذراً، يجب مشاركة رقم هاتفك الشخصي المرتبط بهذا الحساب.")
        return

    phone = message.contact.phone_number.replace('+', '')
    
    # التأكد أن المستخدم طلب الكود من التطبيق أولاً
    if not check_pending_session(phone):
        bot.send_message(
            message.chat.id, 
            "⚠️ لم نجد طلباً نشطاً لهذا الرقم.\n\nيرجى فتح تطبيق Garage أولاً والبدء في عملية التسجيل/الدخول ثم العودة هنا."
        )
        return

    otp = str(random.randint(100000, 999999))
    print(f"Generating OTP {otp} for phone {phone}")
    
    if upsert_to_supabase(phone, otp):
        bot.send_message(
            message.chat.id, 
            f"✅ تم استلام رقمك بنجاح.\n\n🔑 رمز التحقق الخاص بك لـ Garage هو:\n\n {otp} \n\n يرجى إدخاله في التطبيق لإتمام العملية."
        )
    else:
        bot.send_message(message.chat.id, "❌ حدث خطأ أثناء إنشاء الرمز، يرجى المحاولة لاحقاً.")

if __name__ == "__main__":
    bot.infinity_polling()
