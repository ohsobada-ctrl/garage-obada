import { Home, Car, FileText, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
  notificationsCount: number;
}

export function BottomNav({ activeTab, onChangeTab, notificationsCount }: BottomNavProps) {
  const tabs = [
    { id: "dashboard", label: "الرئيسية", icon: Home },
    { id: "cars", label: "سياراتي", icon: Car },
    { id: "docs", label: "الوثائق", icon: FileText },
    { id: "notifications", label: "الإشعارات", icon: Bell },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-t border-border pb-safe">
      <div className="container px-2">
        <div className="flex items-center justify-between py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center w-full py-2 gap-1 transition-all duration-300 rounded-xl",
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary/50"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-6 h-6 transition-transform duration-300", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                  {tab.id === "notifications" && notificationsCount > 0 && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {notificationsCount}
                    </span>
                  )}
                </div>
                <span className={cn("text-[11px] font-medium transition-colors", isActive ? "text-primary" : "")}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
