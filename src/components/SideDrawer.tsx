import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { User, ShieldCheck, Settings, Info, LogOut, Car as CarIcon, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ProfileDialog } from "./ProfileDialog";
import { AdminDashboard } from "./AdminDashboard";
import { SettingsDialog } from "./SettingsDialog";
import { AboutDialog } from "./AboutDialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SideDrawerProps {
  carsCount: number;
}

export function SideDrawer({ carsCount }: SideDrawerProps) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // First time auto-hint onboarding animation
  useEffect(() => {
    try {
      const hasSeenHint = localStorage.getItem("garage_has_seen_menu_hint");
      if (!hasSeenHint) {
        const timerOpen = setTimeout(() => {
          setOpen(true);
        }, 1200);

        const timerClose = setTimeout(() => {
          setOpen(false);
          localStorage.setItem("garage_has_seen_menu_hint", "true");
        }, 2800);

        return () => {
          clearTimeout(timerOpen);
          clearTimeout(timerClose);
        };
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (data) {
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  const handleSignOut = () => {
    signOut();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center animate-glow-pulse hover:scale-105 active:scale-90 transition-transform duration-200 group">
          <CarIcon className="w-5 h-5 text-primary-foreground transition-transform group-active:scale-95" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] sm:w-[350px] font-tajawal p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l-border/30">
        
        {/* User Profile Header section */}
        <div className="p-6 bg-secondary/20 border-b border-border/40 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          
          <Avatar className="w-20 h-20 border-2 border-primary/40 shadow-lg gold-glow-sm">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-primary/20 text-primary text-xl">
              {fullName?.charAt(0) || user?.phoneNumber?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h2 className="text-lg font-bold">{fullName || user?.phoneNumber || user?.phone || 'مستخدم'}</h2>
            {user?.isAdmin && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full mt-1">
                <ShieldCheck className="w-3 h-3" />
                مدير النظام
              </span>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          
          <ProfileDialog>
            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/40 transition-colors text-right group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">الملف الشخصي</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground/50" />
            </button>
          </ProfileDialog>

          {user?.isAdmin && (
            <AdminDashboard carsCount={carsCount}>
              <button 
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/40 transition-colors text-right group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-sm">لوحة الأدمن</span>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground/50" />
              </button>
            </AdminDashboard>
          )}

          <SettingsDialog>
            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/40 transition-colors text-right group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                  <Settings className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">الإعدادات</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground/50" />
            </button>
          </SettingsDialog>

          <AboutDialog>
            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/40 transition-colors text-right group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                  <Info className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">عن التطبيق</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground/50" />
            </button>
          </AboutDialog>

        </div>

        {/* Footer Area with Logout */}
        <div className="p-4 border-t border-border/40">
          <Button 
            variant="ghost" 
            onClick={handleSignOut} 
            className="w-full flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive h-12 rounded-xl"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold">تسجيل الخروج</span>
          </Button>
          <div className="text-center mt-4">
            <p className="text-[10px] text-muted-foreground/50">المرآب - الإصدار 1.0.1</p>
          </div>
        </div>

      </SheetContent>
    </Sheet>
  );
}
