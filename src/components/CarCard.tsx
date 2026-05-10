import { Car, Fuel, Gauge, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Car as CarType, Notification } from '@/types/car';
import { cn } from '@/lib/utils';

interface CarCardProps {
  car: CarType;
  notifications: Notification[];
  onClick: () => void;
}

export function CarCard({ car, notifications, onClick }: CarCardProps) {
  const carNotifications = notifications.filter(n => n.carId === car.id);
  const hasDanger = carNotifications.some(n => n.severity === 'danger');
  const hasWarning = carNotifications.some(n => n.severity === 'warning');

  return (
    <Card 
      interactive 
      onClick={onClick}
      className={cn(
        "animate-fade-in overflow-hidden",
        hasDanger && "border-destructive/50 shadow-destructive/20",
        hasWarning && !hasDanger && "border-warning/50 shadow-warning/20"
      )}
    >
      <div className="gradient-gold h-2" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{car.make} {car.model}</h3>
              <p className="text-muted-foreground text-sm">{car.year}</p>
            </div>
          </div>
          {carNotifications.length > 0 && (
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-bold",
              hasDanger ? "status-danger" : "status-warning"
            )}>
              {carNotifications.length} تنبيه
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gauge className="w-4 h-4 text-primary" />
            <span>{car.currentMileage.toLocaleString()} كم</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Fuel className="w-4 h-4 text-primary" />
            <span>{car.oilServices.length} خدمة زيت</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{car.legalDocs.length} وثائق قانونية</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
