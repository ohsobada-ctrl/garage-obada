import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MessageSquare, UserPlus, LogIn, ArrowRight, Lock, KeyRound, User, ExternalLink } from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Method Choice, 3: OTP, 4: Reset Password
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [method, setMethod] = useState<"email" | "telegram" | null>(null);
  const [telegramNotLinked, setTelegramNotLinked] = useState(false);
  const navigate = useNavigate();

  const isEmail = (val: string) => val.includes("@");

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTelegramNotLinked(false);

    try {
      if (mode === "login") {
        const loginData = isEmail(identifier) 
          ? { email: identifier, password } 
          : { phone: identifier, password };

        const { data, error } = await supabase.auth.signInWithPassword(loginData);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            const { data: profile } = await supabase.from('profiles').select('id').or(`phone.eq.${identifier},email.eq.${identifier}`).single();
            if (!profile) {
              toast.error("الحساب غير موجود، يرجى إنشاء حساب جديد");
              setMode("signup");
              setLoading(false);
              return;
            }
          }
          throw error;
        }

        if (data.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          localStorage.setItem("garage_user_id", data.user.id);
          localStorage.setItem("garage_user_email", data.user.email || "");
          localStorage.setItem("garage_user_phone", profile?.phone || "");
          localStorage.setItem("garage_user_name", profile?.full_name || "");
        }
        
        toast.success("مرحباً بك مجدداً!");
        navigate("/");
        window.location.reload();
      } else {
        if (mode === "signup") setEmail(identifier);
        setStep(2);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateOTP = () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    return newOtp;
  };

  const sendEmailOTP = async () => {
    setLoading(true);
    try {
      const targetEmail = isEmail(identifier) ? identifier : email;
      const { error } = await supabase.auth.signInWithOtp({ email: targetEmail });
      if (error) throw error;
      toast.success("تم إرسال الكود لبريدك الإلكتروني");
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
      const code = generateOTP();
      const targetPhone = mode === "signup" ? phone : identifier;
      
      // استدعاء دالة Supabase الآمنة لإرسال الكود
      const { data: result, error } = await supabase.rpc('send_telegram_otp', { 
        p_phone: targetPhone, 
        p_otp: code 
      });

      if (error) throw error;

      if (result === 'NOT_LINKED') {
        setTelegramNotLinked(true);
        toast.warning("حساب تليجرام غير مرتبط");
      } else {
        toast.success("تم إرسال الكود عبر تليجرام");
        setMethod("telegram");
        setStep(3);
      }
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
      const targetEmail = isEmail(identifier) ? identifier : email;
      if (method === "email") {
        const { error } = await supabase.auth.verifyOtp({ email: targetEmail, token: otp, type: 'magiclink' });
        if (error) throw error;
      } else {
        if (otp !== generatedOtp) throw new Error("كود التحقق غير صحيح");
      }

      if (mode === "signup") {
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({ email: targetEmail, password });
        if (signUpError) throw signUpError;
        if (user) {
          await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, phone });
          localStorage.setItem("garage_user_id", user.id);
        }
        toast.success("تم إنشاء حسابك بنجاح");
        navigate("/");
        window.location.reload();
      } else if (mode === "forgot") {
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
      toast.success("تم تحديث كلمة السر");
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
            {mode === "login" ? <LogIn className="h-8 w-8 text-black" /> : <UserPlus className="h-8 w-8 text-black" />}
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            {mode === "login" ? "تسجيل دخول" : mode === "signup" ? "إنشاء حساب" : "استعادة الحساب"}
          </CardTitle>
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
                <Label className="text-gray-300">{mode === "login" ? "البريد أو الهاتف" : "البريد الإلكتروني"}</Label>
                <Input placeholder="example@mail.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} dir="ltr" className="bg-[#262626] border-gray-700" required />
              </div>
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label className="text-gray-300">رقم الهاتف</Label>
                  <Input placeholder="+218..." value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="bg-[#262626] border-gray-700" required />
                </div>
              )}
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-gray-300">كلمة السر</Label>
                    {mode === "login" && <button type="button" onClick={() => setMode("forgot")} className="text-xs text-amber-500 hover:underline">نسيت كلمة السر؟</button>}
                  </div>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#262626] border-gray-700" required />
                </div>
              )}
              <Button type="submit" className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold" disabled={loading}>
                {loading ? "جاري المعالجة..." : "متابعة"}
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {telegramNotLinked ? (
                <div className="p-6 bg-amber-500/10 border border-amber-500/50 rounded-xl text-center space-y-4">
                  <p className="text-amber-500 font-bold">يجب ربط حساب تليجرام أولاً</p>
                  <p className="text-xs text-gray-400">لضمان وصول الأكواد لك بأمان، يرجى الضغط على الزر أدناه ومشاركة رقم هاتفك مع البوت مرة واحدة فقط.</p>
                  <Button onClick={() => window.open(`https://t.me/Garage3BOT`, "_blank")} className="w-full bg-sky-500 hover:bg-sky-600">
                    <MessageSquare className="ml-2 h-4 w-4" />
                    فتح البوت للربط
                  </Button>
                  <Button variant="ghost" onClick={() => setTelegramNotLinked(false)} className="text-xs">رجوع</Button>
                </div>
              ) : (
                <>
                  <p className="text-center text-sm text-gray-400">اختر طريقة استلام الكود</p>
                  <Button onClick={sendEmailOTP} variant="outline" className="w-full py-8 border-gray-700 bg-[#262626]">
                    <Mail className="ml-3 h-6 w-6 text-blue-500" /> البريد الإلكتروني
                  </Button>
                  <Button onClick={handleTelegramChoice} variant="outline" className="w-full py-8 border-gray-700 bg-[#262626]">
                    <MessageSquare className="ml-3 h-6 w-6 text-sky-500" /> تليجرام (آمن)
                  </Button>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-4 text-center">
                <Label className="text-amber-500 text-lg">أدخل كود التحقق</Label>
                <Input value={otp} onChange={(e) => setOtp(e.target.value)} className="text-center text-4xl h-16 bg-[#262626] border-amber-500 text-amber-500" maxLength={6} required />
              </div>
              <Button type="submit" className="w-full h-12 bg-amber-500 text-black font-bold">تأكيد والدخول</Button>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-gray-300">كلمة السر الجديدة</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#262626] border-gray-700" required />
              </div>
              <Button type="submit" className="w-full h-12 bg-amber-500 text-black font-bold">حفظ والدخول</Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t border-gray-800/50 pt-6">
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setStep(1); }} className="text-sm text-gray-400 hover:text-amber-500">
            {mode === "login" ? "إنشاء حساب جديد" : "العودة لتسجيل الدخول"}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
