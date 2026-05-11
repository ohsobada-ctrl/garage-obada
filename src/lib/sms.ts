export async function sendOTP(phoneNumber: string, otp: string) {
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID || import.meta.env.TWILIO_ACCOUNT_SID;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN || import.meta.env.TWILIO_AUTH_TOKEN;
  const serviceSid = import.meta.env.VITE_TWILIO_MESSAGING_SERVICE_SID || import.meta.env.TWILIO_MESSAGING_SERVICE_SID;

  const message = `كود التحقق الخاص بمرآب أوباما هو: ${otp}`;
  
  // نستخدم خدمة التحقق الرسمية أو الرسائل العادية
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'Body': message,
      'MessagingServiceSid': serviceSid,
      'To': phoneNumber,
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "فشل إرسال الرسالة الرسمية");
  }

  return response.json();
}
