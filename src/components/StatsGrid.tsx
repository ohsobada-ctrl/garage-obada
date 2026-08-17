import { Card, CardContent } from "@/components/ui/card";
import { Car, Bell, Gauge, ShieldCheck } from "lucide-react";
import { Car as CarType, Notification } from "@/types/car";

interface StatsGridProps {
  cars: CarType[];
  notifications: Notification[];
}

export function StatsGrid({ cars, notifications }: StatsGridProps) {
  const totalMileage = cars.reduce((acc, c) => acc + c.currentMileage, 0);
  const totalDocs = cars.reduce((acc, c) => acc + c.legalDocs.length, 0);

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <Card className="bg-destructive/5 border-destructive/20 shadow-sm hover:scale-[1.02] transition-transform">
        <CardContent className="p-3 flex flex-col items-center justify-center text-center h-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/10 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <Bell className="w-6 h-6 text-destructive mb-2" strokeWidth={2} />
          <p className="text-2xl font-black text-destructive">{notifications.length}</p>
          <p className="text-[10px] text-destructive/80 font-bold uppercase tracking-wider mt-1">تنبيهات</p>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20 shadow-sm hover:scale-[1.02] transition-transform">
        <CardContent className="p-3 flex flex-col items-center justify-center text-center h-24 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-16 h-16 bg-primary/10 rounded-full blur-xl -ml-6 -mt-6 pointer-events-none" />
          <Car className="w-6 h-6 text-primary mb-2" strokeWidth={2} />
          <p className="text-2xl font-black text-foreground">{cars.length}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">السيارات</p>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20 shadow-sm hover:scale-[1.02] transition-transform">
        <CardContent className="p-3 flex flex-col items-center justify-center text-center h-24 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl -mr-6 -mb-6 pointer-events-none" />
          <ShieldCheck className="w-6 h-6 text-primary mb-2" strokeWidth={2} />
          <p className="text-2xl font-black text-foreground">{totalDocs}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">وثائق</p>
        </CardContent>
      </Card>

      <Card className="bg-secondary/40 border-border/40 shadow-sm hover:scale-[1.02] transition-transform">
        <CardContent className="p-3 flex flex-col items-center justify-center text-center h-24 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-secondary/50 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none" />
          <Gauge className="w-6 h-6 text-secondary-foreground mb-2" strokeWidth={2} />
          <p className="text-2xl font-black text-foreground">{(totalMileage / 1000).toFixed(1)}<span className="text-sm">k</span></p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">المسافة كم</p>
        </CardContent>
      </Card>
    </div>
  );
}
