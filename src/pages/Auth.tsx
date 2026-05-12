import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Mail, 
  MessageSquare, 
  UserPlus, 
  LogIn, 
  ArrowRight, 
  Lock, 
  KeyRound, 
  User, 
  RefreshCw,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [method, setMethod] = useState<"email" | "telegram" | null>(null);
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const isEmail = (val: string) => val.includes("@");

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const loginData = isEmail(identifier) 
          ? { email: identifier, password } 
          : { phone: identifier, password };

        const { data, error } = await supabase.auth.signInWithPassword(loginData);
        if (error) throw error;

        toast.success("تم تسجيل الدخول");
        navigate("/");
        window.location.reload();
      } else {
        if (mode === "signup") setEmail(identifier);
        setStep(2);
      }
    } catch (error: any) {
      toast.error(error.message === "Invalid login credentials" ? "بيانات الدخول غير صحيحة" : error.message);
    } finally {
      setLoading(false);
    }
  };

  const startOTPProcess = async (chosenMethod: "email" | "telegram") => {
    setLoading(true);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setMethod(chosenMethod);
    
    const targetPhone = mode === "signup" ? phone : identifier;
    const targetEmail = isEmail(identifier) ? identifier : email;

    // حفظ الكود في قاعدة البيانات لكي يقرأه البوت أو أي نظام آخر
    await supabase.from('otp_codes').insert([{ 
      email: targetEmail, 
      phone: targetPhone.replace("+", ""), 
      code: newOtp 
    }]);

    if (chosenMethod === "telegram") {
      // محاولة إرسال عبر تليجرام
      const { data: result } = await supabase.rpc('send_telegram_otp', { 
        p_phone: targetPhone.replace("+", ""), 
        p_otp: newOtp 
      });

      if (result === 'NOT_LINKED') {
        window.open(`https://t.me/Garage3BOT`, "_blank");
        toast.info("يرجى فتح البوت ومشاركة رقمك لاستلام الكود");
      } else {
        toast.success("تم إرسال الكود لتليجرام");
      }
    } else {
      // إرسال الكود عبر إيميل سوبابيس الرسمي (كـ OTP)
      const { error } = await supabase.auth.signInWithOtp({ 
        email: targetEmail,
        options: { shouldCreateUser: mode === "signup" }
      });
      if (error) throw error;
      toast.success("تم إرسال كود التحقق لبريدك");
    }

    setStep(3);
    setTimer(60);
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const targetEmail = isEmail(identifier) ? identifier : email;
      
      // التحقق من الكود
      if (method === "email") {
        // التحقق الرسمي من سوبابيس
        const { error } = await supabase.auth.verifyOtp({ 
          email: targetEmail, 
          token: otp, 
          type: 'email' // نستخدم نوع email ليتطابق مع الـ OTP
        });
        if (error) throw error;
      } else {
        // التحقق اليدوي (لتليجرام)
        if (otp !== generatedOtp) throw new Error("كود التحقق غير صحيح");
      }

      if (mode === "signup") {
        const { data: { user }, error: signUpError } = await supabase.auth.updateUser({ password });
        if (signUpError) throw signUpError;
        if (user) {
          await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, phone });
        }
        toast.success("تم إنشاء الحساب");
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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 font-outfit relative">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500/5 to-blue-500/5 pointer-events-none" />
      
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl text-white">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center shadow-2xl">
            <ShieldCheck className="h-10 w-10 text-black" />
          </div>
          <CardTitle className="text-3xl font-black">
            {mode === "login" ? "تسجيل دخول" : mode === "signup" ? "إنشاء حساب" : "استعادة الحساب"}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6">
          {step === 1 && (
            <form onSubmit={handleInitialSubmit} className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500">الاسم الكامل</Label>
                  <Input placeholder="أدخل اسمك" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white/5 border-white/10 h-12" required />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500">الإيميل أو الهاتف</Label>
                <Input placeholder="example@mail.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} dir="ltr" className="bg-white/5 border-white/10 h-12" required />
              </div>
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500">رقم الهاتف</Label>
                  <Input placeholder="+218..." value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="bg-white/5 border-white/10 h-12" required />
                </div>
              )}
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-gray-500">كلمة السر</Label>
                    {mode === "login" && <button type="button" onClick={() => setMode("forgot")} className="text-xs text-amber-500 font-bold">نسيت كلمة السر؟</button>}
                  </div>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 h-12" required />
                </div>
              )}
              <Button type="submit" className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-black" disabled={loading}>
                {loading ? <RefreshCw className="animate-spin" /> : "متابعة"}
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold">طريقة التحقق</h3>
                <p className="text-sm text-gray-500">اختر أين تريد استلام كود الـ OTP</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <Button onClick={() => startOTPProcess("email")} variant="outline" className="h-20 bg-white/5 border-white/10 flex flex-col">
                  <Mail className="h-6 w-6 text-blue-500 mb-1" />
                  <span>البريد الإلكتروني</span>
                </Button>
                <Button onClick={() => startOTPProcess("telegram")} variant="outline" className="h-20 bg-white/5 border-white/10 flex flex-col">
                  <MessageSquare className="h-6 w-6 text-sky-500 mb-1" />
                  <span>تليجرام (موصى به)</span>
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleVerify} className="space-y-8 text-center">
              <h3 className="text-xl font-bold">أدخل كود التحقق</h3>
              <Input 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                className="text-center text-4xl h-16 bg-white/5 border-amber-500/50 text-amber-500 tracking-widest font-black" 
                maxLength={6} 
                required 
              />
              <div className="space-y-4">
                <Button type="submit" className="w-full h-14 bg-amber-500 text-black font-black text-lg" disabled={loading}>تأكيد</Button>
                {timer > 0 ? (
                  <p className="text-xs text-gray-500">إعادة الطلب بعد {timer} ثانية</p>
                ) : (
                  <button type="button" onClick={() => startOTPProcess(method!)} className="text-xs text-amber-500 font-bold">إعادة إرسال الكود</button>
                )}
              </div>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <Label className="text-xs font-bold text-gray-500">كلمة السر الجديدة</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 h-12" required />
              <Button type="submit" className="w-full h-14 bg-amber-500 text-black font-black">تحديث كلمة السر</Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-white/5 pt-6 pb-8">
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setStep(1); }} className="text-sm text-gray-500 hover:text-amber-500 transition-colors">
            {mode === "login" ? "إنشاء حساب جديد" : "العودة لتسجيل الدخول"}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
