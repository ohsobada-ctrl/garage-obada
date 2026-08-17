import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Car, Info, ShieldCheck, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AboutDialogProps {
  children?: React.ReactNode;
}

export function AboutDialog({ children }: AboutDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? children : (
          <Button variant="ghost" size="sm" className="gap-2">
            <Info className="w-4 h-4" />
            عن التطبيق
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md font-tajawal text-right" dir="rtl">
        <DialogHeader className="text-center flex flex-col items-center justify-center pt-4">
          <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center shadow-lg gold-glow mb-3">
            <Car className="w-8 h-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl font-bold">تطبيق المرآب</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">إصدار النظام v1.0.1</p>
        </DialogHeader>

        <div className="space-y-4 py-4 text-sm leading-relaxed">
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-2">
            <h4 className="font-bold flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              مساعدك الذكي لإدارة المركبات
            </h4>
            <p className="text-muted-foreground text-xs leading-relaxed">
              تطبيق "المرآب" مصمم لمساعدتك في تتبع كافة الصيانات، تغييرات الزيت، الفحص الفني، والتأمين لجميع سياراتك في مكان واحد وبشكل منظم.
            </p>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
              <span className="font-medium text-foreground">الحالة</span>
              <span className="text-success font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> نشط ومتصل
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
              <span className="font-medium text-foreground">لغة الواجهة</span>
              <span>العربية (RTL)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
              <span className="font-medium text-foreground">المبرمج</span>
              <span>Obada</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground pt-2 border-t border-border/40">
          <span>تم التطوير بحب</span>
          <Heart className="w-3.5 h-3.5 text-destructive fill-destructive inline" />
          <span>خدمةً لسائقي السيارات</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
