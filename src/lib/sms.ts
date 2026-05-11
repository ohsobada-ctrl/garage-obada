import { supabase } from "@/integrations/supabase/client";

export async function sendOTP(phoneNumber: string, otp: string) {
  const message = `كود التحقق الخاص بمرآب أوباما هو: ${otp}`;
  
  // استدعاء الدالة التي أنشأناها في SQL Editor لتجنب مشاكل CORS
  const { data, error } = await supabase.rpc('send_sms_via_twilio', {
    to_phone: phoneNumber,
    message_text: message
  });

  if (error) {
    console.error("RPC Error:", error);
    throw new Error(error.message || "فشل إرسال الرسالة عبر الخادم");
  }

  return data;
}
