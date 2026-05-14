import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Mail, 
  Lock, 
  Phone, 
  User, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  MessageSquare,
  ChevronLeft,
  ArrowRight
} from "lucide-react";

type AuthMode = "login" | "signup" | "forgot" | "verify_method" | "otp_input";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [otpTarget, setOtpTarget] = useState<"telegram" | "email" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [identifier, setIdentifier] = useState("");
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const cleanPhone = (val: string) => {
    let cleaned = val.replace(/\D/g, "");
    if (!cleaned) return "";
    // إذا بدأ بـ 0، نحذفه ونضيف رمز ليبيا
    if (cleaned.startsWith("0")) cleaned = "218" + cleaned.substring(1);
    // إذا كان الرقم قصيراً (مثلاً 91xxxxxxx) بدون 218 وبدون 0
    else if (!cleaned.startsWith("218") && cleaned.length >= 8 && cleaned.length <= 10) cleaned = "218" + cleaned;
    return cleaned;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetEmail = loginMethod === "email" ? email : undefined;
    const targetPhone = loginMethod === "phone" ? cleanPhone(phoneNumber) : undefined;

    if (loginMethod === "email" && !email) {
      toast.error("يرجى إدخال البريد الإلكتروني");
      return;
    }
    if (loginMethod === "phone" && !targetPhone) {
      toast.error("يرجى إدخال رقم هاتف صحيح");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        phone: targetPhone,
        password,
      });
      if (error) {
        if (error.message.includes("Invalid login credentials") || error.message.includes("missing email or phone")) {
          throw new Error("بيانات الدخول غير صحيحة. تأكد من الرقم وكلمة المرور.");
        }
        throw error;
      }
      toast.success("تم تسجيل الدخول بنجاح");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateVerification = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "signup") {
      if (fullName.trim().length < 3) {
        toast.error("يرجى إدخال اسم كامل صحيح");
        return;
      }
      if (!email.includes("@") || !email.includes(".")) {
        toast.error("يرجى إدخال بريد إلكتروني صحيح");
        return;
      }
      if (password.length < 8) {
        toast.error("كلمة المرور يجب أن تكون 8 خانات على الأقل");
        return;
      }
      if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        toast.error("كلمة المرور يجب أن تحتوي على حرف كبير ورقم واحد على الأقل");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("كلمات المرور غير متطابقة");
        return;
      }
    }
    
    if (mode === "forgot" && !identifier) {
      toast.error("يرجى إدخال البريد الإلكتروني أو الهاتف");
      return;
    }

    setMode("verify_method");
  };

  const sendOTP = async (method: "telegram" | "email") => {
    setOtpTarget(method);
    setLoading(true);
    try {
      if (method === "telegram") {
        const phone = cleanPhone(phoneNumber || identifier);
        if (!phone || phone.length < 5) throw new Error("يرجى إدخال رقم الهاتف أولاً");
        await supabase.from('auth_sessions').upsert({ phone, status: 'pending' }, { onConflict: 'phone' });
        window.open(`https://t.me/Garage3BOT`, "_blank");
        toast.info("يرجى الحصول على الرمز من البوت");
      } else {
        const target = identifier || email;
        const { error } = await supabase.auth.signInWithOtp({ email: target.toLowerCase() });
        if (error) throw error;
        toast.success("تم إرسال الرمز للبريد الإلكتروني");
      }
      setMode("otp_input");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndFinish = async () => {
    setLoading(true);
    try {
      if (otpTarget === "telegram") {
        const phone = cleanPhone(phoneNumber || identifier);
        const { data, error } = await supabase
          .from('auth_sessions')
          .select('*')
          .eq('phone', phone)
          .eq('otp_code', otp)
          .eq('status', 'awaiting_otp')
          .single();

        if (error || !data) throw new Error("الرمز غير صحيح أو انتهت صلاحيته.");
        
        // التحقق من وجود الإيميل والباسوورد
        if (!email || !password) {
          if (mode === "signup" || mode === "login") {
            throw new Error("يرجى التأكد من إدخال البريد الإلكتروني وكلمة المرور أولاً.");
          }
        }

        // إذا كانت عملية استعادة كلمة مرور
        if (mode === "forgot") {
          // ملاحظة: استعادة الباسوورد عبر تيليجرام تتطلب منطقاً خاصاً في الـ Edge Function 
          // حالياً سنوجه المستخدم لتسجيل الدخول إذا كان يعرف الباسوورد أو استخدام الإيميل
          throw new Error("استعادة كلمة المرور عبر تيليجرام قيد التطوير، يرجى استخدام البريد الإلكتروني حالياً أو التواصل مع الدعم.");
        } else {
          // محاولة تسجيل الدخول أولاً (إذا كان الحساب موجوداً)
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          // إذا لم ينجح الدخول (الحساب غير موجود)، نقوم بإنشائه
          if (signInError) {
            const { error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: { data: { full_name: fullName, phone } }
            });
            if (signUpError) throw signUpError;
          }
        }
      } else {
        // التحقق من كود الإيميل (نظام Supabase الأصلي)
        const { error } = await supabase.auth.verifyOtp({
          email: identifier.toLowerCase() || email.toLowerCase(),
          token: otp,
          type: mode === "forgot" ? 'recovery' : (mode === "signup" ? 'signup' : 'magiclink'),
        });
        if (error) throw error;
      }
      toast.success("تمت العملية بنجاح!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-6 font-sans antialiased" dir="rtl">
      
      {/* Header Section */}
      <div className="w-full max-w-md flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-[#F59E0B] rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/10 mb-6">
          <ShieldCheck className="h-10 w-10 text-black" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-black mb-2">
          {mode === "login" ? "تسجيل الدخول" : mode === "signup" ? "إنشاء حساب" : mode === "forgot" ? "استعادة الحساب" : "تحقق من الهوية"}
        </h1>
        <p className="text-gray-500 text-sm text-center">
          {mode === "login" ? "مرحباً بك في Garage، يرجى تسجيل الدخول لمتابعة" : "يرجى إكمال الخطوات لتأمين حسابك"}
        </p>
      </div>

      <div className="w-full max-w-md">
        {/* Login Tabs */}
        {mode === "login" && (
          <div className="flex border-b border-white/10 mb-8">
            <button onClick={() => setLoginMethod("email")} className={`flex-1 py-4 text-center font-bold relative ${loginMethod === "email" ? "text-[#F59E0B]" : "text-gray-500"}`}>
              البريد الإلكتروني
              {loginMethod === "email" && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#F59E0B]" />}
            </button>
            <button onClick={() => setLoginMethod("phone")} className={`flex-1 py-4 text-center font-bold relative ${loginMethod === "phone" ? "text-[#F59E0B]" : "text-gray-500"}`}>
              رقم الهاتف
              {loginMethod === "phone" && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#F59E0B]" />}
            </button>
          </div>
        )}

        <form onSubmit={mode === "login" ? handleLogin : handleInitiateVerification} className="space-y-4">
          
          {/* Login Fields */}
          {mode === "login" && (
            <>
              <div className="relative">
                {loginMethod === "email" ? <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" /> : <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />}
                <Input 
                  placeholder={loginMethod === "email" ? "example@mail.com" : "05xxxxxxxxx"} 
                  value={loginMethod === "email" ? email : phoneNumber}
                  onChange={(e) => loginMethod === "email" ? setEmail(e.target.value) : setPhoneNumber(e.target.value)}
                  className="bg-[#111111] border-none h-14 pr-12 rounded-xl focus:ring-1 focus:ring-[#F59E0B]" required 
                />
              </div>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input type={showPassword ? "text" : "password"} placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 pl-12 rounded-xl focus:ring-1 focus:ring-[#F59E0B]" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
              </div>
              <button type="button" onClick={() => setMode("forgot")} className="text-[#F59E0B] text-sm font-bold hover:underline">نسيت كلمة المرور؟</button>
              <Button type="submit" disabled={loading} className="w-full h-14 bg-[#F59E0B] hover:bg-amber-600 text-black font-black text-lg rounded-xl mt-4">تسجيل الدخول</Button>

              {loginMethod === "phone" && (
                <Button 
                  type="button" 
                  onClick={() => sendOTP("telegram")} 
                  className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white font-bold text-md rounded-xl flex items-center justify-center gap-2 mt-2"
                >
                  <MessageSquare className="h-5 w-5" />
                  دخول سريع عبر تيليجرام
                </Button>
              )}
            </>
          )}

          {/* Signup Fields */}
          {mode === "signup" && (
            <>
              <div className="relative"><User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" /><Input placeholder="الاسم الكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 rounded-xl" required /></div>
              <div className="relative"><Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" /><Input placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 rounded-xl" required /></div>
              <div className="relative"><Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" /><Input placeholder="رقم الهاتف" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 rounded-xl" required /></div>
              <div className="relative"><Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" /><Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 rounded-xl" required /></div>
              <div className="relative"><Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" /><Input type="password" placeholder="تأكيد كلمة المرور" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 rounded-xl" required /></div>
              <Button type="submit" className="w-full h-14 bg-[#F59E0B] hover:bg-amber-600 text-black font-black text-lg rounded-xl mt-4">إنشاء حساب</Button>
            </>
          )}

          {/* Verification Method Selection */}
          {mode === "verify_method" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
              <p className="text-center text-gray-400 mb-6">اختر وسيلة استلام رمز التحقق</p>
              <Button type="button" onClick={() => sendOTP("telegram")} className="w-full h-16 bg-[#111111] hover:bg-[#1a1a1a] border border-white/5 rounded-2xl flex items-center justify-between px-6 group transition-all hover:border-sky-500/50">
                <div className="flex items-center gap-4"><MessageSquare className="h-6 w-6 text-sky-500" /><span className="font-bold">تيليجرام</span></div>
                <ArrowRight className="h-5 w-5 text-gray-700 group-hover:text-sky-500" />
              </Button>
              <Button type="button" onClick={() => sendOTP("email")} className="w-full h-16 bg-[#111111] hover:bg-[#1a1a1a] border border-white/5 rounded-2xl flex items-center justify-between px-6 group transition-all hover:border-amber-500/50">
                <div className="flex items-center gap-4"><Mail className="h-6 w-6 text-amber-500" /><span className="font-bold">البريد الإلكتروني</span></div>
                <ArrowRight className="h-5 w-5 text-gray-700 group-hover:text-amber-500" />
              </Button>
              <button type="button" onClick={() => setMode("signup")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-white mx-auto pt-4 transition-colors"><ChevronLeft className="h-4 w-4" /> العودة للتسجيل</button>
            </div>
          )}

          {/* OTP Input Field */}
          {mode === "otp_input" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center"><p className="text-gray-400 text-sm mb-2">أدخل رمز التحقق</p><p className="font-bold text-[#F59E0B]">{otpTarget === "telegram" ? phoneNumber : email}</p></div>
              <Input placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value)} className="bg-[#111111] border-none h-16 text-center text-3xl tracking-[0.5em] font-black rounded-xl" maxLength={6} />
              <Button onClick={verifyAndFinish} disabled={loading} className="w-full h-14 bg-[#F59E0B] hover:bg-amber-600 text-black font-black text-lg rounded-xl">تأكيد الرمز</Button>
              <Button variant="link" onClick={() => setMode("verify_method")} className="w-full text-gray-500 text-xs italic">تغيير وسيلة التحقق</Button>
            </div>
          )}

          {/* Forgot Password View */}
          {mode === "forgot" && (
            <div className="space-y-4">
               <div className="relative"><Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" /><Input placeholder="البريد الإلكتروني أو الهاتف" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 rounded-xl" required /></div>
               <Button onClick={() => setMode("verify_method")} className="w-full h-14 bg-[#F59E0B] text-black font-black text-lg rounded-xl">متابعة</Button>
               <Button variant="link" onClick={() => setMode("login")} className="w-full text-gray-500 text-xs">العودة لتسجيل الدخول</Button>
            </div>
          )}

          {/* Switch Mode Button */}
          {mode === "login" && (
            <div className="text-center pt-6">
              <div className="relative py-4 mb-2"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-black px-4 text-gray-500 font-bold">أو</span></div></div>
              <button type="button" onClick={() => setMode("signup")} className="text-[#F59E0B] font-bold hover:underline">إنشاء حساب</button>
            </div>
          )}
          {mode === "signup" && (
            <div className="text-center pt-6">
              <button type="button" onClick={() => setMode("login")} className="text-gray-500 text-sm">لديك حساب بالفعل؟ <span className="text-[#F59E0B] font-bold hover:underline">تسجيل الدخول</span></button>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
