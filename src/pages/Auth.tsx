import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, 
  Mail, 
  Lock,
  User,
  ShieldCheck,
  ArrowRight
} from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "otp">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpMethod, setOtpMethod] = useState<"telegram" | "email" | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const cleanPhone = (val: string) => val.replace(/\D/g, "");

  // تسجيل الدخول العادي (كلمة سر)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isEmail = identifier.includes("@");
      const { error } = await supabase.auth.signInWithPassword({
        email: isEmail ? identifier.toLowerCase() : undefined,
        phone: !isEmail ? cleanPhone(identifier) : undefined,
        password: password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("بيانات الدخول غير صحيحة، أو الحساب غير موجود.");
        }
        throw error;
      }

      navigate("/");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // إرسال كود OTP
  const handleSendOTP = async (method: "telegram" | "email") => {
    setLoading(true);
    try {
      setOtpMethod(method);
      if (method === "telegram") {
        const phone = cleanPhone(identifier);
        if (!phone) throw new Error("يرجى إدخال رقم الهاتف أولاً");
        
        await supabase.from('auth_sessions').upsert({ phone, status: 'pending' }, { onConflict: 'phone' });
        window.open(`https://t.me/Garage3BOT`, "_blank");
        toast.info("يرجى الحصول على الرمز من البوت");
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email: identifier.toLowerCase() });
        if (error) throw error;
        toast.success("تم إرسال الرمز للإيميل");
      }
      setMode("otp");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // التحقق من OTP
  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      if (otpMethod === "telegram") {
        const phone = cleanPhone(identifier);
        const { data, error } = await supabase
          .from('auth_sessions')
          .select('*')
          .eq('phone', phone)
          .eq('otp_code', otp)
          .eq('status', 'awaiting_otp')
          .single();

        if (error || !data) throw new Error("الرمز غير صحيح.");
        
        // جلب بيانات المستخدم
        const { data: profile } = await supabase.from('profiles').select('*').eq('phone', phone).single();
        if (profile) {
          localStorage.setItem("garage_user_id", profile.id);
          navigate("/");
          window.location.reload();
        }
      } else {
        const { error } = await supabase.auth.verifyOtp({
          email: identifier.toLowerCase(),
          token: otp,
          type: 'email',
        });
        if (error) throw error;
        navigate("/");
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.05),transparent_50%)]" />
      
      <Card className="w-full max-w-md border-white/5 bg-white/[0.02] backdrop-blur-3xl text-white shadow-2xl relative z-10 border-t-amber-500/50">
        <CardHeader className="text-center space-y-2 pt-8">
          <div className="mx-auto w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
            <ShieldCheck className="h-8 w-8 text-black" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">
            {mode === "login" ? "تسجيل الدخول" : mode === "signup" ? "إنشاء حساب" : "التحقق من الرمز"}
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            {mode === "otp" ? `أدخل الرمز المرسل إلى ${identifier}` : "مرحباً بك في نظام إدارة المرآب الذكي"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {mode !== "otp" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase">الاسم الكامل</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-600" />
                    <Input placeholder="أدخل اسمك" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white/5 border-white/10 h-12 pl-10" required />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase">الإيميل أو الهاتف</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-600" />
                  <Input placeholder="example@mail.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="bg-white/5 border-white/10 h-12 pl-10" required />
                </div>
              </div>

              {mode !== "otp" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase">كلمة السر</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-600" />
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 h-12 pl-10" required />
                  </div>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-md rounded-xl shadow-lg shadow-amber-500/10">
                {loading ? "جاري المعالجة..." : mode === "login" ? "دخول" : "إنشاء حساب"}
              </Button>

              {mode === "login" && (
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0d0d0d] px-2 text-gray-600">أو عبر كود التحقق</span></div>
                </div>
              )}

              {mode === "login" && (
                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant="outline" onClick={() => handleSendOTP("telegram")} className="border-white/10 bg-white/5 hover:bg-sky-500/10 hover:border-sky-500/50 h-12 font-bold text-xs gap-2">
                    <MessageSquare className="h-4 w-4 text-sky-400" /> تيليجرام
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleSendOTP("email")} className="border-white/10 bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/50 h-12 font-bold text-xs gap-2">
                    <Mail className="h-4 w-4 text-amber-400" /> الإيميل
                  </Button>
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <Input 
                placeholder="000000" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                className="bg-white/5 border-white/20 h-16 text-center text-3xl tracking-[0.5em] font-black focus:border-amber-500 rounded-xl"
                maxLength={6}
              />
              <Button onClick={handleVerifyOTP} disabled={loading} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-md rounded-xl">
                {loading ? "جاري التحقق..." : "تأكيد الرمز"}
              </Button>
              <Button variant="link" onClick={() => setMode("login")} className="w-full text-gray-500 text-xs">العودة لتسجيل الدخول</Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pb-8 border-t border-white/5 pt-6 bg-white/[0.01]">
          <button 
            onClick={() => setMode(mode === "login" ? "signup" : "login")} 
            className="text-sm text-gray-500 hover:text-amber-500 flex items-center gap-2 transition-colors"
          >
            {mode === "login" ? "ليس لديك حساب؟ سجل الآن" : "بالفعل لديك حساب؟ سجل دخولك"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
