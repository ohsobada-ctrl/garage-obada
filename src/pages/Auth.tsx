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
  const [step, setStep] = useState(1); // 1: Form, 2: Method Choice, 3: OTP, 4: Reset Password
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [method, setMethod] = useState<"email" | "telegram" | null>(null);
  const [telegramNotLinked, setTelegramNotLinked] = useState(false);
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  // تفعيل العداد عند إرسال الكود
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
    setTelegramNotLinked(false);

    try {
      if (mode === "login") {
        const loginData = isEmail(identifier) 
          ? { email: identifier, password } 
          : { phone: identifier, password };

        const { data, error } = await supabase.auth.signInWithPassword(loginData);
        if (error) throw error;

        if (data.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          localStorage.setItem("garage_user_id", data.user.id);
          localStorage.setItem("garage_user_email", data.user.email || "");
          localStorage.setItem("garage_user_phone", profile?.phone || "");
          localStorage.setItem("garage_user_name", profile?.full_name || "");
        }
        
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

  const startOTPProcess = (chosenMethod: "email" | "telegram") => {
    setMethod(chosenMethod);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    return newOtp;
  };

  const sendEmailOTP = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      startOTPProcess("email");
      const targetEmail = isEmail(identifier) ? identifier : email;
      const { error } = await supabase.auth.signInWithOtp({ email: targetEmail });
      if (error) throw error;
      toast.success("تم إرسال الكود لبريدك الإلكتروني");
      setStep(3);
      setTimer(60);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramChoice = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      const code = startOTPProcess("telegram");
      const targetPhone = mode === "signup" ? phone : identifier;
      
      const { data: result, error } = await supabase.rpc('send_telegram_otp', { 
        p_phone: targetPhone.replace("+", ""), 
        p_otp: code 
      });

      if (error) throw error;

      if (result === 'NOT_LINKED') {
        setTelegramNotLinked(true);
      } else {
        toast.success("تم إرسال الكود عبر تليجرام");
        setStep(3);
        setTimer(60);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return toast.error("يرجى إدخال الكود كاملاً");
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
        toast.success("تم إنشاء الحساب بنجاح");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 font-outfit relative overflow-hidden">
      {/* خلفية جمالية */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />

      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl text-white shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-2xl flex items-center justify-center rotate-3 shadow-xl">
            <ShieldCheck className="h-10 w-10 text-black -rotate-3" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {mode === "login" ? "تسجيل دخول" : mode === "signup" ? "إنشاء حساب" : "استعادة الحساب"}
            </CardTitle>
            <CardDescription className="text-gray-400 font-medium">
              مرآب أوباما • نظام الإدارة المتكامل
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {step === 1 && (
            <form onSubmit={handleInitialSubmit} className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-gray-500 font-bold">الاسم الكامل</Label>
                  <div className="relative group">
                    <Input placeholder="أدخل اسمك" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white/5 border-white/10 h-12 focus:border-amber-500 transition-all pl-10" required />
                    <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-gray-500 font-bold">الإيميل أو الهاتف</Label>
                <div className="relative group">
                  <Input placeholder="example@mail.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} dir="ltr" className="bg-white/5 border-white/10 h-12 focus:border-amber-500 transition-all pl-10" required />
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                </div>
              </div>

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-gray-500 font-bold">رقم الهاتف</Label>
                  <Input placeholder="+218..." value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="bg-white/5 border-white/10 h-12" required />
                </div>
              )}

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs uppercase tracking-widest text-gray-500 font-bold">كلمة السر</Label>
                    {mode === "login" && <button type="button" onClick={() => setMode("forgot")} className="text-xs text-amber-500 hover:text-amber-400 font-bold">نسيت كلمة السر؟</button>}
                  </div>
                  <div className="relative group">
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 h-12 focus:border-amber-500 transition-all pl-10" required />
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                  </div>
                </div>
              )}
              
              <Button type="submit" className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-black text-lg shadow-lg shadow-amber-500/20" disabled={loading}>
                {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : "متابعة"}
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in zoom-in-95">
              {telegramNotLinked ? (
                <div className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-3xl text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-amber-500">مطلوب ربط تليجرام</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">لأمان حسابك، يرجى فتح البوت ومشاركة رقم هاتفك (مرة واحدة فقط) لتتمكن من استلام الأكواد.</p>
                  </div>
                  <Button onClick={() => window.open(`https://t.me/Garage3BOT`, "_blank")} className="w-full h-12 bg-sky-500 hover:bg-sky-600 font-bold">
                    فتح البوت للربط الآن
                  </Button>
                  <button onClick={() => setTelegramNotLinked(false)} className="text-xs text-gray-500 hover:underline">رجوع للخيارات</button>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-bold">تأكيد الهوية</h3>
                    <p className="text-sm text-gray-500">اختر الطريقة التي تفضلها لاستلام الكود</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <button onClick={sendEmailOTP} className="group w-full p-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-4 transition-all" disabled={loading}>
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Mail className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="text-right">
                        <div className="font-bold">البريد الإلكتروني</div>
                        <div className="text-xs text-gray-500">يصلك الكود فوراً</div>
                      </div>
                    </button>
                    <button onClick={handleTelegramChoice} className="group w-full p-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-4 transition-all" disabled={loading}>
                      <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MessageSquare className="h-6 w-6 text-sky-500" />
                      </div>
                      <div className="text-right">
                        <div className="font-bold">تليجرام (آمن)</div>
                        <div className="text-xs text-gray-500">الخيار الأسرع في ليبيا</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleVerify} className="space-y-8 animate-in slide-in-from-bottom-8">
              <div className="text-center space-y-4">
                <div className="inline-flex p-3 bg-amber-500/10 rounded-full">
                  <ShieldCheck className="h-8 w-8 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold">أدخل كود التحقق</h3>
                <p className="text-sm text-gray-500">أرسلنا كوداً من 6 أرقام إلى {method === "email" ? "بريدك" : "تليجرام"}</p>
                
                <div className="flex justify-center gap-2">
                  <Input 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    className="w-full max-w-[200px] text-center text-3xl font-black h-16 bg-white/5 border-amber-500/30 text-amber-500 tracking-[0.3em] rounded-2xl focus:border-amber-500" 
                    maxLength={6} 
                    required 
                    autoFocus
                  />
                </div>

                {timer > 0 ? (
                  <p className="text-xs text-gray-500">يمكنك إعادة الطلب بعد <span className="text-amber-500 font-bold">{timer}</span> ثانية</p>
                ) : (
                  <button type="button" onClick={method === "email" ? sendEmailOTP : handleTelegramChoice} className="text-xs text-amber-500 font-bold hover:underline flex items-center mx-auto gap-1">
                    <RefreshCw className="h-3 w-3" /> إعادة إرسال الكود
                  </button>
                )}
              </div>
              <Button type="submit" className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-black font-black text-lg rounded-2xl" disabled={loading}>
                {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : "تأكيد الدخول"}
              </Button>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleResetPassword} className="space-y-5 animate-in zoom-in-95">
              <div className="space-y-2 text-center">
                <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold">تم التحقق بنجاح</h3>
                <p className="text-sm text-gray-500">أدخل كلمة سر جديدة قوية لحسابك</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-gray-500 font-bold">كلمة السر الجديدة</Label>
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 h-12" required />
              </div>
              <Button type="submit" className="w-full h-14 bg-amber-500 text-black font-black rounded-2xl">تحديث ودخول</Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-white/5 pt-6 pb-8">
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setStep(1); }} className="group text-sm flex items-center gap-2 text-gray-500 hover:text-amber-500 transition-colors">
            <span>{mode === "login" ? "لا تملك حساباً؟ سجل الآن" : "لديك حساب؟ سجل دخولك"}</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
