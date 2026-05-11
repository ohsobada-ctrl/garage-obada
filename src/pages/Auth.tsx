import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MessageSquare, UserPlus, LogIn, ArrowRight, Lock, KeyRound } from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Method Choice, 3: OTP, 4: Reset Password
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [method, setMethod] = useState<"email" | "telegram" | null>(null);
  const navigate = useNavigate();

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        // تسجيل الدخول العادي
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            // التحقق إذا كان الحساب موجوداً أصلاً
            const { data } = await supabase.from('profiles').select('id').eq('phone', email).single();
            if (!data) {
              toast.error("هذا الحساب غير موجود، يرجى إنشاء حساب جديد");
              setMode("signup");
              setLoading(false);
              return;
            }
          }
          throw error;
        }
        
        toast.success("مرحباً بك مجدداً!");
        navigate("/");
        window.location.reload();
      } else {
        // إنشاء حساب أو نسيت كلمة السر يحتاج OTP
        setStep(2);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAndStoreOTP = async () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    await supabase.from('otp_codes').insert([{ email, phone, code: newOtp }]);
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
      toast.error(error.message);
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
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (method === "email") {
        const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'magiclink' });
        if (error) throw error;
      } else {
        if (otp !== generatedOtp) throw new Error("كود التحقق غير صحيح");
      }

      if (mode === "signup") {
        // إكمال إنشاء الحساب
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (user) {
          await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, phone });
          localStorage.setItem("garage_user_phone", phone);
          localStorage.setItem("garage_user_name", fullName);
        }
        toast.success("تم إنشاء حسابك بنجاح");
        navigate("/");
        window.location.reload();
      } else if (mode === "forgot") {
        // الانتقال لخطوة تعيين كلمة سر جديدة
        setStep(4);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("تم تحديث كلمة السر بنجاح، يمكنك الدخول الآن");
      setMode("login");
      setStep(1);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] p-4 font-outfit">
      <Card className="w-full max-w-md border-gray-800 bg-[#1a1a1a] text-white shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-amber-500/20">
            {mode === "login" ? <LogIn className="h-8 w-8 text-black" /> : 
             mode === "signup" ? <UserPlus className="h-8 w-8 text-black" /> : 
             <KeyRound className="h-8 w-8 text-black" />}
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            {mode === "login" ? "تسجيل دخول" : mode === "signup" ? "إنشاء حساب" : "استعادة الحساب"}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {mode === "login" ? "أهلاً بك مجدداً في مرآب أوباما" : "سجل بياناتك للبدء في إدارة سياراتك"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {step === 1 && (
            <form onSubmit={handleInitialSubmit} className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label className="text-gray-300">الاسم الكامل</Label>
                  <Input placeholder="أدخل اسمك بالكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-[#262626] border-gray-700" required />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-gray-300">البريد الإلكتروني</Label>
                <Input type="email" placeholder="example@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="bg-[#262626] border-gray-700" required />
              </div>
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label className="text-gray-300">رقم الهاتف</Label>
                  <Input type="tel" placeholder="+218..." value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="bg-[#262626] border-gray-700" required />
                </div>
              )}
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-gray-300">كلمة السر</Label>
                    {mode === "login" && (
                      <button type="button" onClick={() => setMode("forgot")} className="text-xs text-amber-500 hover:underline">نسيت كلمة السر؟</button>
                    )}
                  </div>
                  <div className="relative">
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#262626] border-gray-700 pr-10" required />
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold" disabled={loading}>
                {loading ? "جاري المعالجة..." : mode === "login" ? "دخول" : "متابعة التحقق"}
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-center text-sm text-gray-400">اختر طريقة استلام كود التحقق للأمان</p>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={sendEmailOTP} className="w-full p-6 bg-[#262626] border border-gray-700 rounded-xl flex items-center gap-4">
                  <Mail className="h-6 w-6 text-blue-500" />
                  <div className="text-right"><div className="font-bold">الإيميل</div><div className="text-xs text-gray-500">كود فوري</div></div>
                </button>
                <button onClick={handleTelegramChoice} className="w-full p-6 bg-[#262626] border border-gray-700 rounded-xl flex items-center gap-4">
                  <MessageSquare className="h-6 w-6 text-sky-500" />
                  <div className="text-right"><div className="font-bold">تليجرام</div><div className="text-xs text-gray-500">مجاني 100%</div></div>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-4 text-center">
                <Label className="text-amber-500">أدخل كود التحقق</Label>
                <Input type="text" placeholder="------" value={otp} onChange={(e) => setOtp(e.target.value)} className="text-center text-4xl h-16 bg-[#262626] border-amber-500 text-amber-500 font-mono tracking-widest" maxLength={6} required />
              </div>
              <Button type="submit" className="w-full h-12 bg-amber-500 text-black font-bold" disabled={loading}>تأكيد الكود</Button>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-gray-300">كلمة السر الجديدة</Label>
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#262626] border-gray-700" required />
              </div>
              <Button type="submit" className="w-full h-12 bg-amber-500 text-black font-bold">حفظ كلمة السر والدخول</Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t border-gray-800/50 pt-6">
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setStep(1); }} className="text-sm flex items-center gap-2 text-gray-400 hover:text-amber-500 transition-colors">
            {mode === "login" ? "ليس لديك حساب؟ إنشاء حساب جديد" : "لديك حساب بالفعل؟ تسجيل الدخول"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
