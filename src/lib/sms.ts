import { supabase } from "@/integrations/supabase/client";

/**
 * دالة لإرسال كود التحقق يدوياً عبر Supabase Edge Function (أكثر أماناً)
 * أو لاستخدامها في أغراض أخرى.
 */
export const sendSMS = async (to: string, message: string) => {
  try {
    // ملاحظة: إرسال SMS مباشرة من الـ Frontend غير ممكن بسبب حماية Twilio (CORS)
    // ولحماية الـ Auth Token الخاص بك.
    // الطريقة الصحيحة هي استدعاء Edge Function.
    
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: { to, message },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};
