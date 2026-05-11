export async function sendOTP(phoneNumber: string, otp: string) {
  const message = `كود التحقق الخاص بمرآب أوباما هو: ${otp}`;
  
  const { data, error } = await supabase.rpc('send_sms_via_twilio', {
    to_phone: phoneNumber,
    message_text: message
  });

  if (error) {
    console.error("RPC Error:", error);
    throw new Error(error.message || "فشل إرسال الرسالة عبر الخادم");
  }

  // الرد الآن نص، لذا نتأكد أنه لا يحتوي على "error" من Twilio
  if (data && data.toLowerCase().includes('error')) {
    throw new Error("خطأ من Twilio: " + data);
  }

  return data;
}
