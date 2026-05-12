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
  ShieldCheck,
  RefreshCw
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
  const [step, setStep] = useState(1); // 1: Form, 2: Method Choice, 3: OTP, 4: Reset Password
  const [method, setMethod] = useState<"email" | "telegram" | null>(null);
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let interval: any;
    if (timer > 0) interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const isEmail = (val: string) => val.includes("@");

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const loginData = isEmail(identifier) ? { email: identifier, password } : { phone: identifier, password };
        const { error } = await supabase.auth.signInWithPassword(loginData);
        if (error) throw error;
        toast.success("تم تسجيل الدخول بنجاح");
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

  const handleOTPRequest = async (chosenMethod: "email" | "telegram") => {
    if (timer > 0) return;
    setLoading(true);
    try {
      const targetIdentifier = chosenMethod === "email" ? (isEmail(identifier) ? identifier : email) : (mode === "signup" ? phone : identifier);
      
      if (chosenMethod === "email") {
        // استخدام نظام سوبابيس الرسمي للإيميل (أمن جداً)
        const { error } = await supabase.auth.signInWithOtp({ email: targetIdentifier });
        if (error) throw error;
      } else {
        // استخدام دالة السيرفر الآمنة للتليجرام
        const { data, error } = await supabase.rpc('request_otp_secure', { 
          p_identifier: targetIdentifier, 
          p_method: 'telegram' 
        });
        if (error) throw error;
        if (data === 'NOT_LINKED') {
          window.open(`https://t.me/Garage3BOT`, "_blank");
          return toast.info("يرجى ربط البوت أولاً");
        }
      }

      setMethod(chosenMethod);
      setStep(3);
      setTimer(60);
      toast.success("تم إرسال كود التحقق بنجاح");
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
      const targetIdentifier = method === "email" ? (isEmail(identifier) ? identifier : email) : (mode === "signup" ? phone : identifier);
      
      let isValid = false;
      if (method === "email") {
        const { error } = await supabase.auth.verifyOtp({ email: targetIdentifier, token: otp, type: 'email' });
        if (error) throw error;
        isValid = true;
      } else {
        // التحقق في السيرفر حصراً
        const { data, error } = await supabase.rpc('verify_otp_secure', { 
          p_identifier: targetIdentifier, 
          p_code: otp 
        });
        if (error) throw error;
        if (!data) throw new Error("الكود غير صحيح أو انتهت صلاحيته");
        isValid = true;
      }

      if (isValid) {
        if (mode === "signup") {
          const { data: { user }, error: signUpError } = await supabase.auth.signUp({ email: targetIdentifier, password });
          if (signUpError) throw signUpError;
          if (user) await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, phone });
          toast.success("تم إنشاء الحساب بنجاح");
          navigate("/");
          window.location.reload();
        } else if (mode === "forgot") {
          setStep(4);
        }
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
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl text-white shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center">
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
                <h3 className="text-lg font-bold">طريقة التحقق الآمنة</h3>
                <p className="text-sm text-gray-500">اختر أين تريد استلام كود الـ OTP المولد في السيرفر</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <Button onClick={() => handleOTPRequest("email")} variant="outline" className="h-20 bg-white/5 border-white/10">
                  <Mail className="ml-3 h-6 w-6 text-blue-500" /> البريد الإلكتروني
                </Button>
                <Button onClick={() => handleOTPRequest("telegram")} variant="outline" className="h-20 bg-white/5 border-white/10">
                  <MessageSquare className="ml-3 h-6 w-6 text-sky-500" /> تليجرام (آمن)
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
                className="text-center text-4xl h-16 bg-white/5 border-amber-500 text-amber-500 tracking-widest font-black" 
                maxLength={6} 
                required 
              />
              <div className="space-y-4">
                <Button type="submit" className="w-full h-14 bg-amber-500 text-black font-black text-lg" disabled={loading}>تأكيد الكود</Button>
                {timer > 0 ? (
                  <p className="text-xs text-gray-500">يمكنك إعادة الطلب بعد {timer} ثانية</p>
                ) : (
                  <button type="button" onClick={() => handleOTPRequest(method!)} className="text-xs text-amber-500 font-bold">إعادة إرسال الكود</button>
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
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setStep(1); }} className="text-sm text-gray-500 hover:text-amber-500">
            {mode === "login" ? "إنشاء حساب جديد" : "العودة لتسجيل الدخول"}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
