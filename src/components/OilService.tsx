import { useState } from 'react';
import { Droplets, MapPin, Calendar, Gauge, Filter, Plus, History, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OilService as OilServiceType, CarSettings } from '@/types/car';
import { cn } from '@/lib/utils';

interface OilServiceProps {
  services: OilServiceType[];
  currentMileage: number;
  settings: CarSettings;
  onAdd: (service: Omit<OilServiceType, 'id'>) => void;
  onUpdateSettings: (settings: Partial<CarSettings>) => void;
}

export function OilService({ services, currentMileage, settings, onAdd, onUpdateSettings }: OilServiceProps) {
  const [open, setOpen] = useState(false);
  const [stationName, setStationName] = useState('');
  const [oilBrand, setOilBrand] = useState('');
  const [dateOfChange, setDateOfChange] = useState(new Date().toISOString().split('T')[0]);
  const [mileageAtChange, setMileageAtChange] = useState(currentMileage);
  const [filterChanged, setFilterChanged] = useState(true);

  const latestService = services[services.length - 1];
  const previousServices = services.slice(0, -1).reverse();

  const getServiceStatus = () => {
    if (!latestService) return null;
    
    const serviceDate = new Date(latestService.dateOfChange);
    const today = new Date();
    const monthsSinceChange = (today.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const kmSinceChange = currentMileage - latestService.mileageAtChange;
    
    const timePercent = (monthsSinceChange / settings.oilExpiryMonths) * 100;
    const kmPercent = (kmSinceChange / settings.oilRangeKm) * 100;
    const maxPercent = Math.max(timePercent, kmPercent);

    return {
      monthsSinceChange: Math.floor(monthsSinceChange),
      kmSinceChange,
      kmRemaining: settings.oilRangeKm - kmSinceChange,
      monthsRemaining: settings.oilExpiryMonths - Math.floor(monthsSinceChange),
      percent: Math.min(maxPercent, 100),
      status: maxPercent >= 100 ? 'danger' : maxPercent >= 80 ? 'warning' : 'safe',
    };
  };

  const status = getServiceStatus();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationName.trim() || !oilBrand.trim()) return;
    
    onAdd({
      stationName: stationName.trim(),
      oilBrand: oilBrand.trim(),
      dateOfChange,
      mileageAtChange,
      filterChanged,
    });
    
    setStationName('');
    setOilBrand('');
    setDateOfChange(new Date().toISOString().split('T')[0]);
    setMileageAtChange(currentMileage);
    setFilterChanged(true);
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-primary" />
          خدمة الزيت
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="goldOutline" size="sm">
              <Plus className="w-4 h-4" />
              تغيير زيت
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تسجيل تغيير زيت</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="service" className="mt-4">
              <TabsList className="w-full">
                <TabsTrigger value="service" className="flex-1">الخدمة</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">الإعدادات</TabsTrigger>
              </TabsList>
              <TabsContent value="service">
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>مكان التعبئة</Label>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pr-10"
                        placeholder="مثال: محطة الوحدة..."
                        value={stationName}
                        onChange={(e) => setStationName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>نوع الزيت</Label>
                    <Input
                      placeholder="مثال: موبيل 1، كاسترول..."
                      value={oilBrand}
                      onChange={(e) => setOilBrand(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>التاريخ</Label>
                      <Input
                        type="date"
                        value={dateOfChange}
                        onChange={(e) => setDateOfChange(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>العداد (كم)</Label>
                      <Input
                        type="number"
                        value={mileageAtChange}
                        onChange={(e) => setMileageAtChange(parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                    <Checkbox
                      id="filterChanged"
                      checked={filterChanged}
                      onCheckedChange={(checked) => setFilterChanged(checked === true)}
                    />
                    <Label htmlFor="filterChanged" className="flex items-center gap-2 cursor-pointer">
                      <Filter className="w-4 h-4" />
                      تم تغيير الفلتر
                    </Label>
                  </div>
                  <Button type="submit" variant="gold" className="w-full">
                    حفظ الخدمة
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    فترة انتهاء الزيت (شهور)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={settings.oilExpiryMonths}
                    onChange={(e) => onUpdateSettings({ oilExpiryMonths: parseInt(e.target.value) || 6 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    المسافة القصوى (كم)
                  </Label>
                  <Input
                    type="number"
                    min={1000}
                    max={20000}
                    step={500}
                    value={settings.oilRangeKm}
                    onChange={(e) => onUpdateSettings({ oilRangeKm: parseInt(e.target.value) || 5000 })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  سيتم تنبيهك قبل انتهاء أي من الحدين
                </p>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {latestService ? (
          <div className="space-y-4">
            {/* Current Status */}
            <div className={cn(
              "p-4 rounded-lg border",
              status?.status === 'danger' ? 'border-destructive/50 bg-destructive/5' :
              status?.status === 'warning' ? 'border-warning/50 bg-warning/5' :
              'border-success/50 bg-success/5'
            )}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">{latestService.oilBrand}</span>
                <span className={cn(
                  "text-sm font-bold px-2 py-0.5 rounded",
                  status?.status === 'danger' ? 'bg-destructive text-destructive-foreground' :
                  status?.status === 'warning' ? 'bg-warning text-warning-foreground' :
                  'bg-success text-success-foreground'
                )}>
                  {status?.percent.toFixed(0)}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    status?.status === 'danger' ? 'bg-destructive' :
                    status?.status === 'warning' ? 'bg-warning' :
                    'bg-success'
                  )}
                  style={{ width: `${status?.percent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-muted-foreground" />
                  <span>باقي {status?.kmRemaining?.toLocaleString()} كم</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>باقي {status?.monthsRemaining} شهر</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{latestService.stationName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className={cn(
                    "w-4 h-4",
                    latestService.filterChanged ? 'text-success' : 'text-warning'
                  )} />
                  <span>{latestService.filterChanged ? 'الفلتر متبدل' : 'الفلتر ما تبدل!'}</span>
                </div>
              </div>

              {!latestService.filterChanged && (
                <div className="mt-3 p-2 rounded bg-warning/20 text-warning text-sm font-medium">
                  ⚠️ تذكر تبديل الفلتر هالمرة!
                </div>
              )}
            </div>

            {/* Service History */}
            {previousServices.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <History className="w-4 h-4" />
                  السجل السابق
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {previousServices.map((service) => (
                    <div key={service.id} className="p-3 rounded-lg bg-secondary/50 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{service.oilBrand}</span>
                        <span className="text-muted-foreground">
                          {new Date(service.dateOfChange).toLocaleDateString('ar-LY')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-muted-foreground">
                        <span>{service.mileageAtChange.toLocaleString()} كم</span>
                        <span>{service.stationName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Droplets className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>ما في سجل زيت بعد</p>
            <p className="text-sm mt-1">سجل أول تغيير زيت!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
