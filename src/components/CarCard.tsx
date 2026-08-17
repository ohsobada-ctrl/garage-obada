import { Car, Fuel, Gauge, Calendar, Trash2, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Car as CarType, Notification } from '@/types/car';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface CarCardProps {
  car: CarType;
  notifications: Notification[];
  onClick: () => void;
  onDelete?: () => void;
}

export function CarCard({ car, notifications, onClick, onDelete }: CarCardProps) {
  const carNotifications = notifications.filter(n => n.carId === car.id);
  const hasDanger = carNotifications.some(n => n.severity === 'danger');
  const hasWarning = carNotifications.some(n => n.severity === 'warning');

  return (
    <Card 
      className={cn(
        "animate-fade-in overflow-hidden cursor-pointer group hover:scale-[1.01] transition-transform shadow-md border-border/40",
        hasDanger ? "border-destructive/30" : hasWarning ? "border-warning/30" : ""
      )}
      onClick={onClick}
    >
      <div className={cn("h-1.5 w-full", hasDanger ? "bg-destructive" : hasWarning ? "bg-warning" : "gradient-gold")} />
      <CardContent className="p-4 relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center border border-border/50">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">{car.make} {car.model}</h3>
              <p className="text-muted-foreground text-xs mt-0.5">{car.year}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {carNotifications.length > 0 && (
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground animate-pulse shadow-sm">
                {carNotifications.length} تنبيه
              </div>
            )}
            {onDelete && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-7 h-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive z-10"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 bg-secondary/20 rounded-xl p-3 border border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Gauge className="w-4 h-4 text-primary/70" />
            <span className="font-medium text-foreground">{car.currentMileage.toLocaleString()} كم</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Fuel className="w-4 h-4 text-primary/70" />
            <span className="font-medium text-foreground">{car.oilServices?.length || 0} زيت</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground col-span-2">
            <Calendar className="w-4 h-4 text-primary/70" />
            <span className="font-medium text-foreground">{car.legalDocs?.length || 0} وثائق</span>
          </div>
        </div>

        <div className="absolute left-2 top-[50%] -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <ChevronLeft className="w-6 h-6 text-primary/50" />
        </div>
      </CardContent>
    </Card>
  );
}
