import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, MessageSquare } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Method Choice, 3: OTP
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [method, setMethod] = useState<"email" | "telegram" | null>(null);
  const navigate = useNavigate();

  const handleSendInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !phone) {
      return toast.error("يرجى إدخال البريد الإلكتروني ورقم الهاتف");
    }
    setStep(2);
  };

  const generateAndStoreOTP = async () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    
    // تخزين الكود مؤقتاً في قاعدة البيانات لكي يتمكن البوت أو النظام من الوصول إليه
    const { error } = await supabase.from('otp_codes').insert([
      { email, phone, code: newOtp }
    ]);
    
    if (error) {
      console.error("Storage Error:", error);
      throw new Error("فشل توليد كود التحقق");
    }
    
    return newOtp;
  };

  const sendEmailOTP = async () => {
    setLoading(true);
    try {
      const code = await generateAndStoreOTP();
      // هنا نستخدم خاصية إرسال الإيميل من سوبابيس أو إشعار
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      
      toast.success("تم إرسال كود التحقق إلى بريدك الإلكتروني");
      setMethod("email");
      setStep(3);
    } catch (error: any) {
      toast.error("خطأ في إرسال الإيميل: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramChoice = async () => {
    setLoading(true);
    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);
      setMethod("telegram");
      setStep(3);
      
      // نرسل الكود في رابط الـ start لكي يظهر للمستخدم في البوت
      // الرابط سيكون: t.me/bot?start=CODE
      window.open(`https://t.me/Garage3BOT?start=${newOtp}`, "_blank");
      toast.info("يرجى الضغط على Start في البوت لاستلام الكود");
    } catch (error: any) {
      toast.error("خطأ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // التحقق من الكود (سواء كان إيميل سوبابيس أو كودنا المخصص)
      if (method === "email") {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'magiclink'
        });
        if (error) throw error;
      } else {
        if (otp !== generatedOtp) {
          throw new Error("كود التحقق غير صحيح");
        }
      }

      localStorage.setItem("garage_user_phone", phone);
      localStorage.setItem("garage_user_email", email);
      localStorage.setItem("garage_user_id", email);
      
      toast.success("تم تسجيل الدخول بنجاح");
      navigate("/");
      window.location.reload();
    } catch (error: any) {
      toast.error("فشل التحقق: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">مرآب أوباما</CardTitle>
          <CardDescription>نظام إدارة صيانة السيارات الاحترافي</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <form onSubmit={handleSendInfo} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+218..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                متابعة
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-center text-sm text-gray-600 mb-4">اختر طريقة تأكيد الحساب</p>
              <Button 
                onClick={sendEmailOTP} 
                variant="outline" 
                className="w-full py-8 flex flex-col gap-2"
                disabled={loading}
              >
                <Mail className="h-6 w-6 text-blue-500" />
                <span>عبر البريد الإلكتروني</span>
              </Button>
              <Button 
                onClick={handleTelegramChoice} 
                variant="outline" 
                className="w-full py-8 flex flex-col gap-2"
                disabled={loading}
              >
                <MessageSquare className="h-6 w-6 text-sky-500" />
                <span>عبر تليجرام (مجاني)</span>
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="w-full">
                رجوع
              </Button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">أدخل كود التحقق</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-center text-gray-500">
                  {method === "email" 
                    ? "تفقد بريدك الإلكتروني (بما في ذلك Junk/Spam)" 
                    : "تفقد رسائل البوت في تليجرام"}
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "جاري التحقق..." : "تأكيد الدخول"}
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)} className="w-full">
                تغيير الطريقة
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
