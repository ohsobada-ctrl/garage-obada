import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Bell, Volume2, Shield, Moon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SettingsDialogProps {
  children?: React.ReactNode;
}

export function SettingsDialog({ children }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  const handleSave = () => {
    toast.success("تم حفظ إعدادات التطبيق بنجاح");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? children : (
          <Button variant="ghost" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            الإعدادات
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md font-tajawal text-right" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Settings className="w-5 h-5 text-primary" />
            إعدادات التطبيق
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">الإشعارات والتنبيهات</h4>
            
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/40">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  إشعارات التذكير
                </Label>
                <p className="text-xs text-muted-foreground">تلقي إشعارات لمواعيد الزيت والوثائق</p>
              </div>
              <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/40">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" />
                  أصوات التنبيهات
                </Label>
                <p className="text-xs text-muted-foreground">تشغيل صوت عند وصول تذكير مهم</p>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">المزامنة والمظهر</h4>
            
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/40">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  المزامنة السحابية التلقائية
                </Label>
                <p className="text-xs text-muted-foreground">حفظ التغييرات تلقائياً في السحابة</p>
              </div>
              <Switch checked={autoSync} onCheckedChange={setAutoSync} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/40">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Moon className="w-4 h-4 text-primary" />
                  الوضع الداكن (Dark Mode)
                </Label>
                <p className="text-xs text-muted-foreground">مُفعل تلقائياً للهوية البصرية للمرآب</p>
              </div>
              <span className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" /> مفعل
              </span>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full font-bold gradient-gold text-primary-foreground h-12 rounded-xl mt-2">
            حفظ الإعدادات
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
