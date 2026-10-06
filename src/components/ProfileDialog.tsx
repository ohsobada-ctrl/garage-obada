import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Loader2, Save } from "lucide-react";
import { errorMessage } from '@/lib/backendError';

interface ProfileDialogProps {
  children?: React.ReactNode;
}

export function ProfileDialog({ children }: ProfileDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const userId = user?.uid;
  const userPhone = user?.phoneNumber || user?.phone || '';

  useEffect(() => {
    if (!userId || !open) return;
    let active = true;
    async function getProfile() {
      try {
        setLoading(true);
        setProfileLoaded(false);
        setLoadError('');
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, phone, avatar_url")
          .eq("id", userId)
          .maybeSingle();

        if (error) throw error;
        if (!active) return;

        setFullName(data?.full_name || "");
        setPhone(data?.phone || userPhone);
        setAvatarUrl(data?.avatar_url || "");
        setProfileLoaded(true);
      } catch (error) {
        if (active) setLoadError(errorMessage(error, 'تعذر تحميل الملف الشخصي.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    void getProfile();
    return () => { active = false; };
  }, [userId, userPhone, open, loadAttempt]);

  async function updateProfile() {
    if (!userId || loading || !profileLoaded) return;
    if (fullName.trim().length < 3) { toast.error('أدخل اسماً من 3 أحرف على الأقل.'); return; }
    if (avatarUrl.trim()) {
      try {
        if (!['https:', 'http:'].includes(new URL(avatarUrl.trim()).protocol)) throw new Error();
      } catch { toast.error('أدخل رابط صورة صحيحاً يبدأ بـ https://'); return; }
    }
    try {
      setLoading(true);
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      }).select('id').single();

      if (error) throw error;
      toast.success("تم تحديث الملف الشخصي بنجاح");
      window.dispatchEvent(new Event('garage_profile_changed'));
      setOpen(false);
    } catch (error) {
      toast.error("خطأ في التحديث: " + errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => { if (!loading) setOpen(value); }}>
      <DialogTrigger asChild>
        {children ? children : (
          <button className="flex items-center gap-2 text-right hover:opacity-80 transition-opacity">
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
        )}
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
          </div>

          <div className="w-full space-y-4 pt-4">
            {loadError && <div role="alert" className="space-y-2 text-sm text-destructive">
              <p>{loadError}</p>
              <Button variant="outline" onClick={() => setLoadAttempt(value => value + 1)} disabled={loading}>إعادة المحاولة</Button>
            </div>}
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <Input
                id="fullName"
                disabled={loading || !profileLoaded}
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
                disabled={loading || !profileLoaded}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9x xxx xxxx"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">رابط الصورة (URL)</Label>
              <Input
                id="avatar"
                disabled={loading || !profileLoaded}
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="text-right"
              />
            </div>

            {/* Admin Status Toggle */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-500">حالة الصلاحية:</span>
                <span className="text-xs font-black text-amber-400">
                  {user?.isAdmin ? "مسؤول النظام (Admin)" : "مستخدم عادي"}
                </span>
              </div>
              <span className="text-[10px] text-amber-500/80 font-bold bg-amber-500/20 px-2 py-0.5 rounded">
                مفعلة
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>إلغاء</Button>
          <Button className="flex-1 gradient-gold" onClick={updateProfile} disabled={loading || !profileLoaded}>
            {loading ? <Loader2 className="animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
            حفظ التغييرات
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
