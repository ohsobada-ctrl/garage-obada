import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Car, Loader2, Phone, ShieldCheck, AlertCircle, ChevronRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [isConfigMissing, setIsConfigMissing] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    if (!apiKey || apiKey === "your_api_key") {
      setIsConfigMissing(true);
    }
  }, []);

  const formatPhone = (p: string) => {
    let cleaned = p.replace(/\s+/g, '').replace(/-/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('+')) cleaned = '+218' + cleaned;
    return cleaned;
  };

  const setupRecaptcha = () => {
    if (!recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          console.log("Recaptcha resolved");
        }
      });
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return toast.error("يرجى إدخال رقم الهاتف");
    
    if (!auth) {
      return toast.error("خدمة التحقق غير مهيأة بعد. يرجى ضبط إعدادات Firebase.");
    }
    
    setLoading(true);
    try {
      setupRecaptcha();
      const formattedPhone = formatPhone(phone);
      const appVerifier = recaptchaVerifier.current;
      
      if (!appVerifier) throw new Error("Recaptcha not initialized");

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setPhone(formattedPhone);
      setStep("verify");
      toast.success("تم إرسال كود التحقق!");
    } catch (error: any) {
      console.error("Firebase Auth Error:", error);
      toast.error(error.message || "خطأ في إرسال الكود");
      if (recaptchaVerifier.current) {
        recaptchaVerifier.current.clear();
        recaptchaVerifier.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otp.length < 6) return toast.error("يرجى إدخال الرمز كاملاً");
    if (!confirmationResult) return toast.error("حدث خطأ، يرجى المحاولة مرة أخرى");
    
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      toast.success("تم التحقق بنجاح!");
      navigate("/");
    } catch (error: any) {
      toast.error("الرمز غير صحيح أو انتهت صلاحيته");
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
            <CardTitle className="text-2xl">تأكيد الحساب</CardTitle>
            <CardDescription>أدخل الكود المرسل إلى {phone}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="w-12 h-14 text-xl border-primary/20 focus:border-primary" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button className="w-full h-12 gradient-gold" onClick={handleOtpVerify} disabled={loading || otp.length < 6}>
              {loading ? <Loader2 className="animate-spin ml-2" /> : "تأكيد والتحقق"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep("input")}>
              <ChevronRight className="w-4 h-4 ml-2" /> رجوع
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4 overflow-hidden relative font-tajawal">
      <div id="recaptcha-container"></div>
      
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />

      <div className="w-full max-w-md space-y-6">
        {isConfigMissing && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-bold">تنبيه هام</AlertTitle>
            <AlertDescription>يرجى ضبط إعدادات Firebase في ملف .env ليعمل نظام الدخول.</AlertDescription>
          </Alert>
        )}

        <Card className="border-border/40 bg-background/60 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden">
          <div className="gradient-gold h-1.5 w-full" />
          <CardHeader className="text-center space-y-4 pt-8">
            <div className="mx-auto w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center gold-glow animate-float">
              <Car className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-bold">مرآب أوباما</CardTitle>
              <CardDescription className="text-base">تطبيقك المتكامل للعناية بسيارتك</CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="pb-8">
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="9x xxx xxxx" 
                    className="pr-10 text-right text-lg h-12"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">سيصلك رمز تحقق عبر SMS لتأكيد رقمك</p>
              </div>
              
              <Button type="submit" className="w-full h-12 text-lg gradient-gold mt-2" disabled={loading}>
                {loading ? <Loader2 className="animate-spin ml-2" /> : "إرسال كود التحقق"}
              </Button>
            </form>
          </CardContent>
          <div className="p-6 pt-0 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground bg-secondary/30 py-2 rounded-full px-4 w-fit mx-auto">
              <ShieldCheck className="w-3 h-3" /> التحقق عبر Firebase الآمن
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
