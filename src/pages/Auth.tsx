import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MessageSquare, UserPlus, LogIn, ArrowRight } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Method Choice, 3: OTP
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [method, setMethod] = useState<"email" | "telegram" | null>(null);
  const navigate = useNavigate();

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !fullName) {
      return toast.error("يرجى إدخال اسمك الكامل");
    }
    if (!email || !phone) {
      return toast.error("يرجى إدخال البريد الإلكتروني ورقم الهاتف");
    }
    setStep(2);
  };

  const generateAndStoreOTP = async () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    
    // حفظ الكود في قاعدة البيانات للرجوع إليه
    const { error } = await supabase.from('otp_codes').insert([
      { email, phone, code: newOtp }
    ]);
    
    if (error) {
      console.error("Storage Error:", error);
    }
    
    return newOtp;
  };

  const sendEmailOTP = async () => {
    setLoading(true);
    try {
      await generateAndStoreOTP();
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
      const code = await generateAndStoreOTP();
      setMethod("telegram");
      setStep(3);
      window.open(`https://t.me/Garage3BOT?start=${code}`, "_blank");
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

      // في حال كان إنشاء حساب، نقوم بتحديث البيانات الإضافية
      if (!isLogin) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            full_name: fullName,
            phone: phone,
            updated_at: new Date().toISOString(),
          });
        }
      }

      // تخزين بيانات الجلسة يدوياً لضمان التوافق مع الأنظمة القديمة
      localStorage.setItem("garage_user_phone", phone);
      localStorage.setItem("garage_user_email", email);
      localStorage.setItem("garage_user_name", fullName || email);
      
      toast.success(isLogin ? "مرحباً بك مجدداً!" : "تم إنشاء حسابك بنجاح");
      navigate("/");
      window.location.reload();
    } catch (error: any) {
      toast.error("فشل التحقق: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] p-4 font-outfit">
      <Card className="w-full max-w-md border-gray-800 bg-[#1a1a1a] text-white shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-amber-500/20">
            {isLogin ? <LogIn className="h-8 w-8 text-black" /> : <UserPlus className="h-8 w-8 text-black" />}
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isLogin ? "أهلاً بك مجدداً في مرآب أوباما" : "انضم إلينا لإدارة صيانة سياراتك باحترافية"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {step === 1 && (
            <form onSubmit={handleInitialSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">الاسم الكامل</Label>
                  <Input
                    id="name"
                    placeholder="أدخل اسمك بالكامل"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-[#262626] border-gray-700 text-white focus:ring-amber-500"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  className="bg-[#262626] border-gray-700 text-white focus:ring-amber-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">رقم الهاتف</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+218..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="bg-[#262626] border-gray-700 text-white focus:ring-amber-500"
                />
              </div>
              <Button type="submit" className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold transition-all duration-300">
                {isLogin ? "تسجيل دخول" : "إنشاء الحساب"}
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-center text-sm text-gray-400 mb-6">اختر طريقة استلام كود التحقق</p>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={sendEmailOTP} 
                  className="w-full p-6 bg-[#262626] hover:bg-[#333] border border-gray-700 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  disabled={loading}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold">البريد الإلكتروني</div>
                    <div className="text-xs text-gray-500">سريع وآمن</div>
                  </div>
                </button>

                <button 
                  onClick={handleTelegramChoice} 
                  className="w-full p-6 bg-[#262626] hover:bg-[#333] border border-gray-700 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  disabled={loading}
                >
                  <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-sky-500" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold">تليجرام (مجاني)</div>
                    <div className="text-xs text-gray-500">الخيار المفضل في ليبيا</div>
                  </div>
                </button>
              </div>
              <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-gray-500 mt-2">
                رجوع للتعديل
              </Button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleVerify} className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="space-y-4 text-center">
                <Label htmlFor="otp" className="text-lg text-amber-500">كود التحقق</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center text-4xl h-16 bg-[#262626] border-amber-500/50 text-amber-500 font-mono tracking-[0.5em] focus:border-amber-500 focus:ring-amber-500"
                  maxLength={6}
                  required
                />
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  {method === "email" 
                    ? "تفحص صندوق الوارد (Spam أيضاً)" 
                    : "افتح البوت واضغط Start"}
                </div>
              </div>
              <Button type="submit" className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold shadow-lg shadow-amber-500/20" disabled={loading}>
                {loading ? "جاري التحقق..." : "تأكيد والبدء"}
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)} className="w-full text-gray-500">
                تغيير الطريقة
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t border-gray-800/50 pt-6">
          <button 
            onClick={() => { setIsLogin(!isLogin); setStep(1); }}
            className="text-sm flex items-center gap-2 text-gray-400 hover:text-amber-500 transition-colors"
          >
            {isLogin ? "ليس لديك حساب؟ إنشاء حساب جديد" : "لديك حساب بالفعل؟ تسجيل الدخول"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
