import { supabase } from "@/integrations/supabase/client";

export async function sendOTP(phoneNumber: string, otp: string) {
  const message = `كود التحقق الخاص بمرآب أوباما هو: ${otp}`;
  
  // نستخدم الدالة V3 الجديدة لضمان استقرار الردود النصية
  const { data, error } = await supabase.rpc('send_sms_v3', {
    to_phone: phoneNumber,
    message_text: message
  });

  if (error) {
    console.error("RPC Error:", error);
    throw new Error(error.message || "فشل إرسال الرسالة عبر الخادم");
  }

  // إذا كان الرد يحتوي على كلمة error، فهذا يعني خطأ من Twilio
  if (data && data.toLowerCase().includes('error')) {
    console.error("Twilio Error Details:", data);
    throw new Error("خطأ من Twilio: " + data);
  }

  return data;
}
