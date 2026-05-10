import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Car, Loader2, Phone, Mail, Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState(""); // Email or Phone
  const [isConfigMissing, setIsConfigMissing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if Supabase keys are placeholders
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || url.includes("your-project") || !key || key.includes("your-anon-key")) {
      setIsConfigMissing(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !password) return toast.error("يرجى إدخال البيانات");
    
    setLoading(true);
    try {
      const isEmail = loginIdentifier.includes("@");
      const loginParams = isEmail 
        ? { email: loginIdentifier, password }
        : { phone: loginIdentifier, password };

      const { error } = await supabase.auth.signInWithPassword(loginParams);
      if (error) throw error;
      
      toast.success("مرحباً بك مجدداً!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "خطأ في الدخول");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) return toast.error("رقم الهاتف وكلمة المرور مطلوبان");
    
    setLoading(true);
    try {
      const signUpParams: any = {
        phone,
        password,
        options: {
          data: {
            full_name: phone, // Default name to phone
          }
        }
      };

      if (email) {
        signUpParams.email = email;
      }

      const { error } = await supabase.auth.signUp(signUpParams);
      if (error) throw error;
      
      toast.success("تم إنشاء الحساب بنجاح! يمكنك الآن الدخول.");
    } catch (error: any) {
      toast.error(error.message || "خطأ في إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const identifier = loginIdentifier || email;
    if (!identifier || !identifier.includes("@")) {
      return toast.error("يرجى إدخال بريدك الإلكتروني لاستعادة كلمة المرور");
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      if (error) throw error;
      toast.success("تم إرسال رابط استعادة كلمة المرور إلى بريدك");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ ما");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4 overflow-hidden relative font-tajawal">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />

      <div className="w-full max-w-md space-y-6">
        {isConfigMissing && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-bold">تنبيه هام</AlertTitle>
            <AlertDescription>
              يرجى ضبط إعدادات Supabase (URL و Anon Key) في ملف .env ليعمل نظام الدخول.
            </AlertDescription>
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
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-secondary/50 p-1 rounded-xl">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">دخول</TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">حساب جديد</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-id">البريد الإلكتروني أو رقم الهاتف</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="login-id" 
                        placeholder="example@mail.com أو رقم الهاتف" 
                        className="pr-10 text-right"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="login-password">كلمة المرور</Label>
                      <button 
                        type="button" 
                        onClick={handleForgotPassword}
                        className="text-xs text-primary hover:underline"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="login-password" 
                        type="password" 
                        className="pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit"
                    className="w-full h-12 text-lg gradient-gold gold-glow-sm mt-2" 
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin ml-2" /> : "دخول"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">رقم الهاتف (إجباري)</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="reg-phone" 
                        type="tel" 
                        placeholder="9x xxx xxxx" 
                        className="pr-10 text-right"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">البريد الإلكتروني (اختياري)</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="reg-email" 
                        type="email" 
                        placeholder="example@mail.com" 
                        className="pr-10 text-right"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">كلمة المرور (إجباري)</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="reg-password" 
                        type="password" 
                        className="pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit"
                    className="w-full h-12 text-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/50 mt-2"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin ml-2" /> : "إنشاء حساب"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <div className="p-6 pt-0 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground bg-secondary/30 py-2 rounded-full px-4 w-fit mx-auto">
              <ShieldCheck className="w-3 h-3" />
              تشفير عسكري لحماية بياناتك
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
