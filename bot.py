import os
import telebot
from telebot import types
import random
import requests
import json
import time

# بيانات البوت و Supabase
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8694896406:AAEspC9Hr_sYfdPc9AANB1mqO3sQ94GXELI")
SUPABASE_URL = "https://ufaqfqcbovgkpqlujnxo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmYXFmcWNib3Zna3BxbHVqbnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTc1MTIsImV4cCI6MjA5Mzk5MzUxMn0.yWOTOCQN_3VM8FY2-vag_Ul6f_v0mLD365O4NTKr8p0"

bot = telebot.TeleBot(TOKEN)

def get_session_by_chat_id(chat_id):
    url = f"{SUPABASE_URL}/rest/v1/auth_sessions?chat_id=eq.{chat_id}&limit=1"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    try:
        r = requests.get(url, headers=headers)
        return r.json()[0] if r.status_code == 200 and r.json() else None
    except: return None

def check_pending_session(phone):
    url = f"{SUPABASE_URL}/rest/v1/auth_sessions?phone=eq.{phone}&status=eq.pending"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    try:
        r = requests.get(url, headers=headers)
        return len(r.json()) > 0
    except: return False

def upsert_to_supabase(phone, otp, chat_id=None):
    url = f"{SUPABASE_URL}/rest/v1/auth_sessions?on_conflict=phone"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    data = {"phone": phone, "otp_code": otp, "status": "awaiting_otp"}
    if chat_id: data["chat_id"] = chat_id
    try:
        r = requests.post(url, headers=headers, data=json.dumps(data))
        return r.status_code in [200, 201, 204]
    except: return False

@bot.message_handler(commands=['start'])
def send_welcome(message):
    chat_id = message.chat.id
    session = get_session_by_chat_id(chat_id)
    
    if session and check_pending_session(session['phone']):
        otp = str(random.randint(100000, 999999))
        if upsert_to_supabase(session['phone'], otp, chat_id):
            bot.send_message(chat_id, f"✅ تم التعرف عليك.\n🔑 الرمز: {otp}")
            return

    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, one_time_keyboard=True)
    markup.add(types.KeyboardButton("📲 مشاركة الرقم", request_contact=True))
    bot.send_message(chat_id, "🛡️ يرجى مشاركة رقمك لإصدار الكود:", reply_markup=markup)

@bot.message_handler(content_types=['contact'])
def handle_contact(message):
    if message.contact.user_id != message.from_user.id:
        bot.send_message(message.chat.id, "⚠️ يرجى مشاركة رقمك الشخصي.")
        return
    
    phone = message.contact.phone_number.replace('+', '')
    if check_pending_session(phone):
        otp = str(random.randint(100000, 999999))
        if upsert_to_supabase(phone, otp, message.chat.id):
            bot.send_message(message.chat.id, f"✅ الرمز الخاص بك هو: {otp}")
        else:
            bot.send_message(message.chat.id, "❌ خطأ في النظام.")
    else:
        bot.send_message(message.chat.id, "⚠️ ابدأ من التطبيق أولاً.")

@bot.message_handler(func=lambda m: True)
def auto_reply(message):
    send_welcome(message)

if __name__ == "__main__":
    print("🚀 Bot is running...")
    while True:
        try:
            bot.polling(none_stop=True, interval=2, timeout=20)
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(5)
