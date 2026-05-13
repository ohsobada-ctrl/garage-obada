import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, 
  Mail, 
  ArrowRight, 
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

type AuthStep = "identifier" | "method" | "otp" | "complete";

export default function Auth() {
  const [step, setStep] = useState<AuthStep>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [method, setMethod] = useState<"telegram" | "email" | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // تنظيف الرقم من الرموز الزائدة
  const cleanPhone = (val: string) => val.replace(/\D/g, "");

  const handleCheckIdentifier = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const isEmail = identifier.includes("@");
      const cleaned = isEmail ? identifier.toLowerCase() : cleanPhone(identifier);
      
      // التحقق من وجود المستخدم في جدول profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq(isEmail ? 'email' : 'phone', cleaned)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        setUserExists(false);
        toast.error("الحساب غير موجود! يرجى إنشاء حساب جديد أولاً.");
        return;
      }

      setUserExists(true);
      setStep("method");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (selectedMethod: "telegram" | "email") => {
    setMethod(selectedMethod);
    setLoading(true);
    
    try {
      if (selectedMethod === "telegram") {
        const phone = cleanPhone(identifier);
        // إنشاء جلسة في قاعدة البيانات
        await supabase.from('auth_sessions').upsert({ 
          phone, 
          status: 'pending' 
        }, { onConflict: 'phone' });
        
        window.open(`https://t.me/Garage3BOT`, "_blank");
        toast.info("يرجى الحصول على الرمز من البوت الآن");
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: identifier.toLowerCase(),
        });
        if (error) throw error;
        toast.success("تم إرسال رمز التحقق إلى بريدك الإلكتروني");
      }
      setStep("otp");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      if (method === "telegram") {
        const phone = cleanPhone(identifier);
        const { data, error } = await supabase
          .from('auth_sessions')
          .select('*')
          .eq('phone', phone)
          .eq('otp_code', otp)
          .eq('status', 'awaiting_otp')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error || !data) throw new Error("الرمز غير صحيح.");

        // تحديث البيانات في LocalStorage (محاكاة للجلسة)
        const { data: profile } = await supabase.from('profiles').select('*').eq('phone', phone).single();
        if (profile) {
          localStorage.setItem("garage_user_id", profile.id);
          localStorage.setItem("garage_user_name", profile.full_name || "");
          localStorage.setItem("garage_user_phone", profile.phone || "");
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
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
      {/* عناصر زخرفية خلفية */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse delay-700" />

      <Card className="w-full max-w-md border-white/5 bg-white/[0.03] backdrop-blur-2xl text-white shadow-2xl relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500" />
        
        <CardHeader className="text-center pt-10 pb-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6 group transition-transform hover:scale-105 duration-300">
            <ShieldCheck className="h-10 w-10 text-black" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tight mb-2">مرآب أوباما</CardTitle>
          <CardDescription className="text-gray-400">نظام إدارة السيارات الذكي</CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-10">
          {step === "identifier" && (
            <form onSubmit={handleCheckIdentifier} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">رقم الهاتف أو البريد الإلكتروني</Label>
                <div className="relative group">
                  <Input 
                    placeholder="9x xxx xxxx / user@mail.com" 
                    value={identifier} 
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="bg-white/5 border-white/10 h-14 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-center text-lg placeholder:text-gray-600"
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-black font-black text-lg rounded-2xl transition-all active:scale-[0.98]">
                {loading ? "جاري التحقق..." : "متابعة"}
                <ArrowRight className="mr-2 h-5 w-5" />
              </Button>
            </form>
          )}

          {step === "method" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-6">
                <p className="text-gray-400 text-sm">اختر طريقة استلام رمز التحقق</p>
              </div>
              <div className="grid gap-4">
                <button 
                  onClick={() => handleSendOTP("telegram")}
                  className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-sky-500/50 transition-all group text-right"
                >
                  <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    <MessageSquare className="h-6 w-6 text-sky-400 group-hover:text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">تيليجرام</h3>
                    <p className="text-xs text-gray-500 italic">الأسرع والمجاني دائماً</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-gray-700 group-hover:text-sky-500" />
                </button>

                <button 
                  onClick={() => handleSendOTP("email")}
                  className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-amber-500/50 transition-all group text-right"
                >
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Mail className="h-6 w-6 text-amber-400 group-hover:text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">البريد الإلكتروني</h3>
                    <p className="text-xs text-gray-500">استلام الكود عبر الإيميل</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-gray-700 group-hover:text-amber-500" />
                </button>
              </div>
              <button onClick={() => setStep("identifier")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-white mx-auto pt-4 transition-colors">
                <ChevronLeft className="h-4 w-4" />
                تغيير البيانات
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-2">
                <p className="text-gray-400 text-sm">أدخل الرمز المرسل إلى</p>
                <p className="font-bold text-amber-500" dir="ltr">{identifier}</p>
              </div>
              
              <div className="space-y-6">
                <Input 
                  placeholder="000000" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  className="bg-white/5 border-white/20 h-20 text-center text-4xl tracking-[0.5em] font-black focus:border-amber-500 rounded-2xl"
                  maxLength={6}
                  autoFocus
                />

                <Button 
                  onClick={handleVerifyOTP} 
                  disabled={loading || otp.length < 6}
                  className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-black font-black text-lg rounded-2xl shadow-xl shadow-amber-500/20"
                >
                  {loading ? "جاري التحقق..." : "تأكيد الدخول"}
                </Button>

                <div className="flex flex-col gap-2 pt-4">
                  <Button variant="link" onClick={() => handleSendOTP(method!)} className="text-gray-500 text-xs hover:text-white">
                    إعادة إرسال الرمز؟
                  </Button>
                  <Button variant="link" onClick={() => setStep("method")} className="text-gray-500 text-xs hover:text-white">
                    تغيير وسيلة التحقق
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {step === "identifier" && (
          <div className="p-6 border-t border-white/5 text-center bg-white/[0.01]">
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4" />
              ليس لديك حساب؟
              <button className="text-amber-500 font-bold hover:underline">سجل الآن</button>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
