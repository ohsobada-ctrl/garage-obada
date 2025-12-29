import { useState } from 'react';
import { Disc, CircleDot, Calendar, Plus, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrakeTireService, CarSettings } from '@/types/car';
import { cn } from '@/lib/utils';

interface BrakesTiresProps {
  services: BrakeTireService[];
  settings: CarSettings;
  onAdd: (service: Omit<BrakeTireService, 'id'>) => void;
  onUpdateSettings: (settings: Partial<CarSettings>) => void;
}

export function BrakesTires({ services, settings, onAdd, onUpdateSettings }: BrakesTiresProps) {
  const [open, setOpen] = useState(false);
  const [activeType, setActiveType] = useState<'brakes' | 'tires'>('brakes');
  const [lastChangeDate, setLastChangeDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const brakesService = services.find(s => s.type === 'brakes');
  const tiresService = services.find(s => s.type === 'tires');

  const getServiceStatus = (service: BrakeTireService | undefined, reminderMonths: number) => {
    if (!service) return null;
    
    const lastChange = new Date(service.lastChangeDate);
    const today = new Date();
    const monthsSinceChange = (today.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const percent = (monthsSinceChange / reminderMonths) * 100;

    return {
      monthsSinceChange: Math.floor(monthsSinceChange),
      monthsRemaining: Math.max(0, reminderMonths - Math.floor(monthsSinceChange)),
      percent: Math.min(percent, 100),
      status: percent >= 100 ? 'warning' : 'safe',
    };
  };

  const brakesStatus = getServiceStatus(brakesService, settings.brakeReminderMonths);
  const tiresStatus = getServiceStatus(tiresService, settings.tireReminderMonths);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      type: activeType,
      lastChangeDate,
      notes: notes.trim() || undefined,
    });
    setLastChangeDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setOpen(false);
  };

  const ServiceCard = ({ 
    type, 
    label, 
    icon: Icon, 
    service, 
    status, 
    reminderMonths 
  }: { 
    type: 'brakes' | 'tires';
    label: string;
    icon: typeof Disc;
    service?: BrakeTireService;
    status: ReturnType<typeof getServiceStatus>;
    reminderMonths: number;
  }) => (
    <div className={cn(
      "p-4 rounded-lg border transition-all",
      service ? (
        status?.status === 'warning' ? 'border-warning/50 bg-warning/5' : 'border-success/50 bg-success/5'
      ) : 'border-dashed border-muted-foreground/30'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            service ? (
              status?.status === 'warning' ? 'bg-warning/20' : 'bg-success/20'
            ) : 'bg-muted'
          )}>
            <Icon className={cn(
              "w-5 h-5",
              service ? (
                status?.status === 'warning' ? 'text-warning' : 'text-success'
              ) : 'text-muted-foreground'
            )} />
          </div>
          <div>
            <p className="font-medium">{label}</p>
            {service ? (
              <p className={cn(
                "text-sm",
                status?.status === 'warning' ? 'text-warning' : 'text-success'
              )}>
                {status?.monthsRemaining === 0 
                  ? 'حان وقت الفحص!'
                  : `الفحص بعد ${status?.monthsRemaining} شهر`}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">غير مسجل</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setActiveType(type);
            setOpen(true);
          }}
        >
          {service ? 'تحديث' : 'إضافة'}
        </Button>
      </div>
      
      {service && (
        <>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                status?.status === 'warning' ? 'bg-warning' : 'bg-success'
              )}
              style={{ width: `${status?.percent}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>آخر تغيير: {new Date(service.lastChangeDate).toLocaleDateString('ar-LY')}</span>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Disc className="w-5 h-5 text-primary" />
          البريكات والكفرات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ServiceCard
          type="brakes"
          label="البريكات"
          icon={Disc}
          service={brakesService}
          status={brakesStatus}
          reminderMonths={settings.brakeReminderMonths}
        />
        <ServiceCard
          type="tires"
          label="الكفرات"
          icon={CircleDot}
          service={tiresService}
          status={tiresStatus}
          reminderMonths={settings.tireReminderMonths}
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {activeType === 'brakes' ? 'البريكات' : 'الكفرات'}
              </DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="service" className="mt-4">
              <TabsList className="w-full">
                <TabsTrigger value="service" className="flex-1">الخدمة</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">الإعدادات</TabsTrigger>
              </TabsList>
              <TabsContent value="service">
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>تاريخ آخر تغيير/فحص</Label>
                    <Input
                      type="date"
                      value={lastChangeDate}
                      onChange={(e) => setLastChangeDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ملاحظات (اختياري)</Label>
                    <Input
                      placeholder="أي ملاحظات إضافية..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="gold" className="w-full">
                    حفظ
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    فترة تذكير البريكات (شهور)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={settings.brakeReminderMonths}
                    onChange={(e) => onUpdateSettings({ brakeReminderMonths: parseInt(e.target.value) || 6 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    فترة تذكير الكفرات (شهور)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={settings.tireReminderMonths}
                    onChange={(e) => onUpdateSettings({ tireReminderMonths: parseInt(e.target.value) || 6 })}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
