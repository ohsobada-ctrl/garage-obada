import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ChevronLeft
} from "lucide-react";

type AuthMode = "login" | "signup" | "forgot" | "reset_password" | "verify_signup" | "verify_recovery";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form states
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [otpToken, setOtpToken] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state changes to detect password recovery redirection
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset_password");
      }
    });
    
    // Check url hash directly (sometimes the event doesn't fire immediately)
    const hash = window.location.hash;
    if (hash && (hash.includes("type=recovery") || hash.includes("recovery"))) {
      setMode("reset_password");
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
    
    if (!email) {
      toast.error("يرجى إدخال البريد الإلكتروني");
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      const isAdminEmail = cleanEmail === "ohsobada@gmail.com";

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast.warning("البريد الإلكتروني لم يتم تأكيده بعد. سنرسل لك رمز تحقق جديد.");
          await supabase.auth.resend({
            type: "signup",
            email: cleanEmail,
          });
          setMode("verify_signup");
          return;
        }
        if (error.message.includes("Invalid login credentials") || error.message.includes("missing email or phone")) {
          throw new Error("بيانات الدخول غير صحيحة. تأكد من البريد الإلكتروني وكلمة المرور.");
        }
        throw error;
      }
      
      if (data?.user) {
        localStorage.setItem("garage_user_email", cleanEmail);
        localStorage.setItem("garage_user_id", data.user.id);
        if (isAdminEmail) {
          localStorage.setItem("garage_is_admin", "true");
        }
      }
      
      // حفظ خيار تذكرني
      localStorage.setItem("remember_me", rememberMe ? "true" : "false");
      toast.success(isAdminEmail ? "تم تسجيل دخول الأدمن بنجاح 👑" : "تم تسجيل الدخول بنجاح");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phoneNumber ? cleanPhone(phoneNumber) : undefined
          }
        }
      });

      if (error) {
        if (error.message.includes("rate limit")) {
          throw new Error("فشل التسجيل: تم تجاوز حد المحاولات. انتظر قليلاً.");
        }
        throw error;
      }

      if (data?.session) {
        localStorage.setItem("remember_me", rememberMe ? "true" : "false");
        toast.success("تم إنشاء الحساب وتسجيل الدخول بنجاح!");
        navigate("/");
      } else {
        toast.success("تم إنشاء الحساب بنجاح! يرجى إدخال رمز التحقق المكون من 6 أرقام المرسل إلى بريدك الإلكتروني.");
        setOtpToken("");
        setMode("verify_signup");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("يرجى إدخال البريد الإلكتروني");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("تم إرسال رمز استعادة كلمة المرور إلى بريدك الإلكتروني");
      setOtpToken("");
      setMode("verify_recovery");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpToken.length < 6 || otpToken.length > 8) {
      toast.error("يرجى إدخال رمز التحقق المكون من 6 إلى 8 أرقام");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase(),
        token: otpToken,
        type: "signup",
      });

      if (error) throw error;

      localStorage.setItem("remember_me", rememberMe ? "true" : "false");
      toast.success("تم تأكيد الحساب وتسجيل الدخول بنجاح!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "رمز التحقق غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpToken.length < 6 || otpToken.length > 8) {
      toast.error("يرجى إدخال رمز استعادة الحساب المكون من 6 إلى 8 أرقام");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase(),
        token: otpToken,
        type: "recovery",
      });

      if (error) throw error;

      toast.success("تم التحقق بنجاح! يرجى إدخال كلمة المرور الجديدة.");
      setMode("reset_password");
    } catch (error: any) {
      toast.error(error.message || "رمز استعادة الحساب غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });
      if (error) throw error;
      toast.success("تم تحديث كلمة المرور بنجاح! تم تسجيل دخولك.");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (mode === "login") return handleLogin(e);
    if (mode === "signup") return handleSignup(e);
    if (mode === "forgot") return handleForgotPassword(e);
    if (mode === "verify_signup") return handleVerifySignup(e);
    if (mode === "verify_recovery") return handleVerifyRecovery(e);
    if (mode === "reset_password") return handleResetPassword(e);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-6 font-sans antialiased" dir="rtl">
      
      {/* Header Section */}
      <div className="w-full max-w-md flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-[#F59E0B] rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/10 mb-6">
          <ShieldCheck className="h-10 w-10 text-black" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-black mb-2">
          {mode === "login" && "تسجيل الدخول"}
          {mode === "signup" && "إنشاء حساب"}
          {mode === "forgot" && "استعادة الحساب"}
          {mode === "verify_signup" && "رمز التحقق للبريد"}
          {mode === "verify_recovery" && "رمز استعادة الحساب"}
          {mode === "reset_password" && "تغيير كلمة المرور"}
        </h1>
        <p className="text-gray-500 text-sm text-center">
          {mode === "login" && "مرحباً بك في Garage، يرجى تسجيل الدخول لمتابعة"}
          {mode === "signup" && "يرجى إدخال بياناتك لإنشاء حساب جديد"}
          {mode === "forgot" && "أدخل بريدك الإلكتروني لإرسال رمز الاستعادة"}
          {mode === "verify_signup" && "أدخل الرمز المكون من 6 أرقام لتأكيد حسابك"}
          {mode === "verify_recovery" && "أدخل رمز الاستعادة المكون من 6 أرقام"}
          {mode === "reset_password" && "أدخل كلمة المرور الجديدة لتحديث حسابك"}
        </p>
      </div>

      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Login Mode */}
          {mode === "login" && (
            <>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input 
                  type="email"
                  placeholder="example@mail.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#111111] border-none h-14 pr-12 rounded-xl focus:ring-1 focus:ring-[#F59E0B]" required 
                />
              </div>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input type={showPassword ? "text" : "password"} placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 pl-12 rounded-xl focus:ring-1 focus:ring-[#F59E0B]" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
              </div>
              
              <div className="flex items-center justify-between mt-2 px-1">
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-800 bg-[#111111] text-[#F59E0B] focus:ring-0 focus:ring-offset-0 h-4 w-4 accent-[#F59E0B]" 
                  />
                  تذكرني
                </label>
                <button type="button" onClick={() => setMode("forgot")} className="text-[#F59E0B] text-sm font-bold hover:underline">نسيت كلمة المرور؟</button>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 bg-[#F59E0B] hover:bg-amber-600 text-black font-black text-lg rounded-xl mt-4">تسجيل الدخول</Button>
            </>
          )}

          {/* Signup Mode */}
          {mode === "signup" && (
            <>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input placeholder="الاسم الكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 rounded-xl" required />
              </div>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 rounded-xl" required />
              </div>
              <div className="relative">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input placeholder="رقم الهاتف (اختياري)" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 rounded-xl" />
              </div>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input type={showPassword ? "text" : "password"} placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 pl-12 rounded-xl" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
              </div>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input type={showConfirmPassword ? "text" : "password"} placeholder="تأكيد كلمة المرور" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 pl-12 rounded-xl" required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
              </div>

              <div className="flex items-center gap-2 mt-2 px-1">
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-800 bg-[#111111] text-[#F59E0B] focus:ring-0 focus:ring-offset-0 h-4 w-4 accent-[#F59E0B]" 
                  />
                  تذكرني في هذا الجهاز
                </label>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 bg-[#F59E0B] hover:bg-amber-600 text-black font-black text-lg rounded-xl mt-4">إنشاء حساب</Button>
            </>
          )}

          {/* Verify Signup Mode */}
          {mode === "verify_signup" && (
            <>
              <div className="text-center mb-4">
                <p className="text-sm text-gray-400">
                  لقد أرسلنا رمز التحقق إلى بريدك الإلكتروني: <br />
                  <span className="text-white font-bold">{email}</span>
                </p>
              </div>
              <div className="relative">
                <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input 
                  type="text" 
                  maxLength={8}
                  placeholder="رمز التحقق" 
                  value={otpToken} 
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ""))} 
                  className="bg-[#111111] border-none h-14 pr-12 text-center text-xl font-bold tracking-[0.3em] rounded-xl focus:ring-1 focus:ring-[#F59E0B]" 
                  required 
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-14 bg-[#F59E0B] hover:bg-amber-600 text-black font-black text-lg rounded-xl mt-4">تأكيد رمز التحقق</Button>
              <button type="button" onClick={() => setMode("signup")} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-white mx-auto pt-4 transition-colors">
                <ChevronLeft className="h-4 w-4 rotate-180" /> تعديل البريد الإلكتروني
              </button>
            </>
          )}

          {/* Verify Recovery Mode */}
          {mode === "verify_recovery" && (
            <>
              <div className="text-center mb-4">
                <p className="text-sm text-gray-400">
                  لقد أرسلنا رمز استعادة الحساب إلى بريدك الإلكتروني: <br />
                  <span className="text-white font-bold">{email}</span>
                </p>
              </div>
              <div className="relative">
                <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input 
                  type="text" 
                  maxLength={8}
                  placeholder="رمز الاستعادة" 
                  value={otpToken} 
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ""))} 
                  className="bg-[#111111] border-none h-14 pr-12 text-center text-xl font-bold tracking-[0.3em] rounded-xl focus:ring-1 focus:ring-[#F59E0B]" 
                  required 
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-14 bg-[#F59E0B] hover:bg-amber-600 text-black font-black text-lg rounded-xl mt-4">تأكيد رمز الاستعادة</Button>
              <button type="button" onClick={() => setMode("forgot")} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-white mx-auto pt-4 transition-colors">
                <ChevronLeft className="h-4 w-4 rotate-180" /> تعديل البريد الإلكتروني
              </button>
            </>
          )}

          {/* Forgot Password Mode */}
          {mode === "forgot" && (
            <>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 rounded-xl" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-14 bg-[#F59E0B] hover:bg-amber-600 text-black font-black text-lg rounded-xl mt-4">إرسال رمز الاستعادة</Button>
              <button type="button" onClick={() => setMode("login")} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-white mx-auto pt-4 transition-colors">
                <ChevronLeft className="h-4 w-4 rotate-180" /> العودة لتسجيل الدخول
              </button>
            </>
          )}

          {/* Reset Password Mode */}
          {mode === "reset_password" && (
            <>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input type={showPassword ? "text" : "password"} placeholder="كلمة المرور الجديدة" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 pl-12 rounded-xl focus:ring-1 focus:ring-[#F59E0B]" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
              </div>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Input type={showConfirmPassword ? "text" : "password"} placeholder="تأكيد كلمة المرور الجديدة" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-[#111111] border-none h-14 pr-12 pl-12 rounded-xl focus:ring-1 focus:ring-[#F59E0B]" required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-14 bg-[#F59E0B] hover:bg-amber-600 text-black font-black text-lg rounded-xl mt-4">حفظ كلمة المرور</Button>
            </>
          )}

          {/* Mode switch helper buttons */}
          {mode === "login" && (
            <div className="text-center pt-6">
              <div className="relative py-4 mb-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-black px-4 text-gray-500 font-bold">أو</span></div>
              </div>
              <button type="button" onClick={() => setMode("signup")} className="text-[#F59E0B] font-bold hover:underline">إنشاء حساب جديد</button>
            </div>
          )}
          {mode === "signup" && (
            <div className="text-center pt-6">
              <button type="button" onClick={() => setMode("login")} className="text-gray-500 text-sm">
                لديك حساب بالفعل؟ <span className="text-[#F59E0B] font-bold hover:underline">تسجيل الدخول</span>
              </button>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
