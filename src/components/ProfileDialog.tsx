import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Loader2, Save, Camera } from "lucide-react";

export function ProfileDialog() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user && open) {
      getProfile();
    }
  }, [user, open]);

  async function getProfile() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("id", user?.uid)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || user?.phoneNumber || "");
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (error: any) {
      toast.error("خطأ في جلب البيانات: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);
      const { error } = await supabase.from("profiles").upsert({
        id: user?.uid,
        full_name: fullName,
        phone: phone,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success("تم تحديث الملف الشخصي بنجاح");
      setOpen(false);
    } catch (error: any) {
      toast.error("خطأ في التحديث: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-3 text-right hover:opacity-80 transition-opacity">
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">الملف الشخصي</p>
            <p className="text-sm font-bold truncate max-w-[100px]">{fullName || user?.phoneNumber || user?.phone || 'مستخدم'}</p>
          </div>
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md font-tajawal">
        <DialogHeader>
          <DialogTitle>تعديل الملف الشخصي</DialogTitle>
          <DialogDescription>
            قم بتحديث معلوماتك الشخصية ليظهر اسمك بشكل صحيح في التطبيق.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-secondary shadow-xl">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-3xl">
                {fullName?.charAt(0) || user?.phoneNumber?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full shadow-lg border border-border">
              <Camera className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="w-full space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <Input 
                id="fullName" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخل اسمك الكامل"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profilePhone">رقم الهاتف</Label>
              <Input 
                id="profilePhone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9x xxx xxxx"
                className="text-right"
                disabled // Phone is usually managed via Auth
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">رابط الصورة (URL)</Label>
              <Input 
                id="avatar" 
                value={avatarUrl} 
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="text-right"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button className="flex-1 gradient-gold" onClick={updateProfile} disabled={loading}>
            {loading ? <Loader2 className="animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
            حفظ التغييرات
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
