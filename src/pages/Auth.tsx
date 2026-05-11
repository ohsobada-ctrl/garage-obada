import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MessageSquare, UserPlus, LogIn, ArrowRight, Lock, KeyRound, User } from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState(""); // يمثل الإيميل أو الرقم
  const [email, setEmail] = useState(""); // للإيميل الحقيقي
  const [phone, setPhone] = useState(""); // للرقم الحقيقي
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Method Choice, 3: OTP, 4: Reset Password
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [method, setMethod] = useState<"email" | "telegram" | null>(null);
  const navigate = useNavigate();

  // دالة ذكية للتعرف على نوع المدخل (إيميل أم هاتف)
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
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("بيانات الدخول غير صحيحة، أو الحساب غير موجود");
          } else {
            throw error;
          }
          setLoading(false);
          return;
        }

        if (data.user) {
          // جلب بيانات البروفايل للتأكد من تخزينها محلياً
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          localStorage.setItem("garage_user_id", data.user.id);
          localStorage.setItem("garage_user_email", data.user.email || "");
          localStorage.setItem("garage_user_phone", profile?.phone || "");
          localStorage.setItem("garage_user_name", profile?.full_name || data.user.email || "");
        }
        
        toast.success("مرحباً بك مجدداً!");
        navigate("/");
        window.location.reload();
      } else {
        // في وضع الإنشاء أو الاستعادة، نحتاج لتأكيد البيانات أولاً
        if (mode === "signup") {
          setEmail(identifier); // نفترض أن المستخدم أدخل إيميله في البداية
        }
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
    await supabase.from('otp_codes').insert([{ 
      email: isEmail(identifier) ? identifier : email, 
      phone: !isEmail(identifier) ? identifier : phone, 
      code: newOtp 
    }]);
    return newOtp;
  };

  const sendEmailOTP = async () => {
    setLoading(true);
    try {
      await generateAndStoreOTP();
      const targetEmail = isEmail(identifier) ? identifier : email;
      const { error } = await supabase.auth.signInWithOtp({ email: targetEmail });
      if (error) throw error;
      toast.success("تم إرسال كود التحقق إلى البريد الإلكتروني");
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
      const targetEmail = isEmail(identifier) ? identifier : email;
      
      if (method === "email") {
        const { error } = await supabase.auth.verifyOtp({ email: targetEmail, token: otp, type: 'magiclink' });
        if (error) throw error;
      } else {
        if (otp !== generatedOtp) throw new Error("كود التحقق غير صحيح");
      }

      if (mode === "signup") {
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({ 
          email: targetEmail, 
          password,
          options: {
            data: { full_name: fullName, phone: phone }
          }
        });
        if (signUpError) throw signUpError;
        if (user) {
          await supabase.from('profiles').upsert({ 
            id: user.id, 
            full_name: fullName, 
            phone: phone 
          });
          localStorage.setItem("garage_user_id", user.id);
          localStorage.setItem("garage_user_phone", phone);
          localStorage.setItem("garage_user_name", fullName);
          localStorage.setItem("garage_user_email", targetEmail);
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
      toast.success("تم تحديث كلمة السر بنجاح");
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
        </CardHeader>
        <CardContent className="pt-4">
          {step === 1 && (
            <form onSubmit={handleInitialSubmit} className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label className="text-gray-300">الاسم الكامل</Label>
                  <div className="relative">
                    <Input placeholder="أدخل اسمك بالكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-[#262626] border-gray-700 pr-10" required />
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-gray-300">{mode === "login" ? "البريد أو رقم الهاتف" : "البريد الإلكتروني"}</Label>
                <Input 
                  type="text" 
                  placeholder={mode === "login" ? "example@mail.com أو +218..." : "example@mail.com"} 
                  value={identifier} 
                  onChange={(e) => setIdentifier(e.target.value)} 
                  dir="ltr" 
                  className="bg-[#262626] border-gray-700" 
                  required 
                />
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
              <p className="text-center text-sm text-gray-400">اختر طريقة استلام كود التحقق</p>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={sendEmailOTP} className="w-full p-6 bg-[#262626] border border-gray-700 rounded-xl flex items-center gap-4">
                  <Mail className="h-6 w-6 text-blue-500" />
                  <div className="text-right font-bold">البريد الإلكتروني</div>
                </button>
                <button onClick={handleTelegramChoice} className="w-full p-6 bg-[#262626] border border-gray-700 rounded-xl flex items-center gap-4">
                  <MessageSquare className="h-6 w-6 text-sky-500" />
                  <div className="text-right font-bold">تليجرام</div>
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
              <Button type="submit" className="w-full h-12 bg-amber-500 text-black font-bold" disabled={loading}>تأكيد والبدء</Button>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-gray-300">كلمة السر الجديدة</Label>
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#262626] border-gray-700" required />
              </div>
              <Button type="submit" className="w-full h-12 bg-amber-500 text-black font-bold">حفظ والدخول</Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t border-gray-800/50 pt-6">
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setStep(1); }} className="text-sm flex items-center gap-2 text-gray-400 hover:text-amber-500 transition-colors">
            {mode === "login" ? "إنشاء حساب جديد" : "العودة لتسجيل الدخول"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
