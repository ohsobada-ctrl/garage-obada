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
  RefreshCw,
  Zap
} from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingForTelegram, setWaitingForTelegram] = useState(false);
  const navigate = useNavigate();

  // نظام المراقبة الذكية (الانتظار حتى يؤكد المستخدم في تليجرام)
  useEffect(() => {
    let interval: any;
    if (waitingForTelegram) {
      interval = setInterval(async () => {
        const { data, error } = await supabase
          .from('auth_sessions')
          .select('status')
          .eq('phone', identifier.replace('+', ''))
          .eq('status', 'verified')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          clearInterval(interval);
          handleFinalLogin();
        }
      }, 2000); // يفحص كل ثانيتين
    }
    return () => clearInterval(interval);
  }, [waitingForTelegram, identifier]);

  const handleFinalLogin = async () => {
    toast.success("✅ تم تأكيد هويتك بنجاح! جاري تسجيل الدخول...");
    
    // تسجيل دخول تلقائي (بما أن الهوية تأكدت في تليجرام)
    // في هذا النظام، نستخدم الإيميل المرتبط أو نسجل دخولنا يدوياً
    if (mode === "login") {
       // جلب بيانات المستخدم وتدشين الجلسة
       const { data: profile } = await supabase.from('profiles').select('*').eq('phone', identifier.replace('+', '')).single();
       if (profile) {
         localStorage.setItem("garage_user_id", profile.id);
         localStorage.setItem("garage_user_name", profile.full_name);
         localStorage.setItem("garage_user_phone", profile.phone);
         navigate("/");
         window.location.reload();
       }
    } else {
       // في حال الإنشاء، نطلب منه إكمال كلمة السر
       setWaitingForTelegram(false);
       toast.info("يرجى إكمال إعداد حسابك الآن");
    }
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier.includes("@") ? identifier : undefined,
          phone: identifier.includes("@") ? undefined : identifier,
          password
        });
        if (error) throw error;
        navigate("/");
        window.location.reload();
      } else {
        // التحقق من تليجرام أولاً قبل الإنشاء
        await startTelegramVerification();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const startTelegramVerification = async () => {
    setLoading(true);
    try {
      const phone = identifier.replace('+', '');
      // إنشاء جلسة انتظار في قاعدة البيانات
      await supabase.from('auth_sessions').insert([{ phone, status: 'pending' }]);
      
      setWaitingForTelegram(true);
      window.open(`https://t.me/Garage3BOT?start=verify`, "_blank");
      toast.info("يرجى تأكيد هويتك في تليجرام الآن...");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 relative">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl text-white shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center">
            <ShieldCheck className="h-10 w-10 text-black" />
          </div>
          <CardTitle className="text-3xl font-black">
            {waitingForTelegram ? "بانتظار تليجرام..." : mode === "login" ? "تسجيل دخول" : "إنشاء حساب"}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6">
          {waitingForTelegram ? (
            <div className="text-center space-y-6 py-8">
              <div className="relative mx-auto w-20 h-20">
                <RefreshCw className="h-20 w-20 text-amber-500 animate-spin opacity-20" />
                <MessageSquare className="absolute inset-0 m-auto h-10 w-10 text-sky-500 animate-bounce" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold">يرجى مشاركة رقمك في البوت</p>
                <p className="text-sm text-gray-500">بمجرد الضغط على "مشاركة الرقم" في تليجرام، سيفتح هذا التطبيق تلقائياً.</p>
              </div>
              <Button onClick={() => window.open(`https://t.me/Garage3BOT`, "_blank")} className="w-full bg-sky-500 hover:bg-sky-600 font-bold">
                فتح تليجرام مرة أخرى
              </Button>
            </div>
          ) : (
            <form onSubmit={handleInitialSubmit} className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">الاسم الكامل</Label>
                  <Input placeholder="أدخل اسمك" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white/5 border-white/10 h-12" required />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">الإيميل أو الهاتف</Label>
                <Input placeholder="example@mail.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} dir="ltr" className="bg-white/5 border-white/10 h-12" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">كلمة السر</Label>
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 h-12" required />
              </div>
              <Button type="submit" className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-black font-black text-lg">
                {mode === "login" ? "دخول" : "تأكيد الهوية والبدء"}
              </Button>
            </form>
          )}
        </CardContent>

        {!waitingForTelegram && (
          <CardFooter className="flex justify-center border-t border-white/5 pt-6 pb-8">
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-sm text-gray-500 hover:text-amber-500 flex items-center gap-2">
              {mode === "login" ? "إنشاء حساب جديد" : "العودة لتسجيل الدخول"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
