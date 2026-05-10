import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Car, Loader2, Phone, Mail, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const navigate = useNavigate();

  const handleEmailAuth = async (type: "login" | "signup") => {
    setLoading(true);
    try {
      const { error } = type === "login" 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (error) throw error;
      
      if (type === "signup") {
        toast.success("تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني.");
      } else {
        toast.success("مرحباً بك مجدداً!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ ما");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async () => {
    if (!phone) return toast.error("يرجى إدخال رقم الهاتف");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setStep("verify");
      toast.success("تم إرسال رمز التحقق");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ في إرسال الرمز");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otp.length < 6) return toast.error("يرجى إدخال الرمز كاملاً");
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms'
      });
      if (error) throw error;
      toast.success("تم التحقق بنجاح!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "الرمز غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />

      <Card className="w-full max-w-md border-border/40 bg-background/60 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="gradient-gold h-1.5 w-full rounded-t-xl" />
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center gold-glow animate-float">
            <Car className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold font-tajawal">مرآب أوباما</CardTitle>
            <CardDescription className="text-base">تطبيقك المتكامل للعناية بسيارتك</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="phone" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-secondary/50 p-1">
              <TabsTrigger value="phone" className="gap-2 data-[state=active]:bg-background">
                <Phone className="w-4 h-4" />
                رقم الهاتف
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2 data-[state=active]:bg-background">
                <Mail className="w-4 h-4" />
                البريد الإلكتروني
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="space-y-6">
              {step === "input" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="9x xxx xxxx" 
                        className="pr-10 text-right"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full h-12 text-lg gradient-gold gold-glow-sm" 
                    onClick={handlePhoneSubmit}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin ml-2" /> : "إرسال رمز التحقق"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="space-y-2">
                    <Label>رمز التحقق</Label>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup className="gap-2">
                          <InputOTPSlot index={0} className="w-12 h-14 text-xl border-border/60" />
                          <InputOTPSlot index={1} className="w-12 h-14 text-xl border-border/60" />
                          <InputOTPSlot index={2} className="w-12 h-14 text-xl border-border/60" />
                          <InputOTPSlot index={3} className="w-12 h-14 text-xl border-border/60" />
                          <InputOTPSlot index={4} className="w-12 h-14 text-xl border-border/60" />
                          <InputOTPSlot index={5} className="w-12 h-14 text-xl border-border/60" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      تم إرسال الرمز إلى {phone}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Button 
                      className="w-full h-12 text-lg gradient-gold gold-glow-sm"
                      onClick={handleOtpVerify}
                      disabled={loading || otp.length < 6}
                    >
                      {loading ? <Loader2 className="animate-spin ml-2" /> : "تأكيد الرمز"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full" 
                      onClick={() => setStep("input")}
                      disabled={loading}
                    >
                      تغيير الرقم
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="example@mail.com" 
                      className="pr-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      className="pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-11"
                    onClick={() => handleEmailAuth("signup")}
                    disabled={loading}
                  >
                    إنشاء حساب
                  </Button>
                  <Button 
                    className="h-11 gradient-gold"
                    onClick={() => handleEmailAuth("login")}
                    disabled={loading}
                  >
                    دخول
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <div className="p-6 pt-0 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-secondary/30 py-2 rounded-full px-4 w-fit mx-auto">
            <ShieldCheck className="w-3 h-3" />
            بياناتك مشفرة ومحمية بالكامل
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
