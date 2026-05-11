import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Car, Loader2, Phone, CheckCircle2, ShieldCheck, ChevronRight } from "lucide-react";
import { sendOTP } from "@/lib/sms";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const Auth = () => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return toast.error("يرجى إدخال رقم الهاتف");
    
    setLoading(true);
    try {
      // توليد كود عشوائي من 6 أرقام
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);
      
      // إرسال الكود عبر Twilio
      await sendOTP(phone, newOtp);
      
      setStep("verify");
      toast.success("تم إرسال كود التحقق بنجاح");
    } catch (error: any) {
      console.error(error);
      toast.error("خطأ في إرسال الكود: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otp || otp.length < 6) return toast.error("يرجى إدخال كود التحقق كاملاً");

    setLoading(true);
    try {
      if (otp === generatedOtp) {
        // تخزين رقم الهاتف كمعرف مستخدم في localStorage
        localStorage.setItem("garage_user_phone", phone);
        localStorage.setItem("garage_user_id", phone.replace(/\D/g, ""));
        
        toast.success("تم تسجيل الدخول بنجاح");
        navigate("/");
        window.location.reload(); 
      } else {
        toast.error("كود التحقق غير صحيح");
      }
    } catch (error: any) {
      console.error("Verification Error:", error);
      toast.error("خطأ في التحقق: " + (error.message || "رمز غير معروف"));
    } finally {
      setLoading(false);
    }
  };

  if (step === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 font-tajawal">
        <Card className="w-full max-w-md border-border/40 bg-background/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">تأكيد الحساب</CardTitle>
            <CardDescription className="text-base pt-2">أدخل الكود المرسل إلى {phone}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <div className="flex justify-center" dir="ltr">
              <InputOTP maxLength={6} value={otp} onChange={(val) => {
                setOtp(val);
                if (val.length === 6) handleVerifyOtp();
              }}>
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="w-12 h-14 text-xl border-primary/20 focus:border-primary font-bold" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button className="w-full h-12 text-lg font-bold gradient-gold" onClick={() => handleVerifyOtp()} disabled={loading || otp.length < 6}>
              {loading ? <Loader2 className="animate-spin ml-2" /> : "تأكيد والتحقق"}
            </Button>
            <Button variant="ghost" className="w-full h-10" onClick={() => setStep("input")}>
              <ChevronRight className="w-4 h-4 ml-2" /> رجوع لتغيير الرقم
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-tajawal relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse delay-700" />

      <Card className="w-full max-w-md border-2 border-primary/10 shadow-2xl relative z-10 backdrop-blur-sm bg-background/95">
        <div className="h-1.5 w-full gradient-gold" />
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center shadow-lg gold-glow animate-float">
              <Car className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold tracking-tight">مرآب أوباما</CardTitle>
            <CardDescription className="text-lg">تطبيقك المتكامل للعناية بسيارتك</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-8">
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold block text-right pr-1">رقم الهاتف</label>
              <div className="relative group">
                <Input
                  type="tel"
                  placeholder="9x xxx xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 text-left h-12 text-lg border-2 focus:ring-primary/20 transition-all group-hover:border-primary/30"
                  dir="ltr"
                />
                <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground text-right mt-2 pr-1">سيوصلك رمز تحقق عبر SMS لتأكيد رقمك</p>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-bold gradient-gold hover:opacity-90 transition-all shadow-md group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
              ) : (
                "إرسال كود التحقق"
              )}
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4 opacity-70">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span>التحقق عبر Twilio الرسمي</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
