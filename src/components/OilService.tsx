import { useState } from 'react';
import { format } from 'date-fns';
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
import { useSaveAction } from '@/hooks/useSaveAction';

interface OilServiceProps {
  services: OilServiceType[];
  currentMileage: number;
  settings: CarSettings;
  onAdd: (service: Omit<OilServiceType, 'id'>) => Promise<unknown>;
  onUpdateSettings: (settings: Partial<CarSettings>) => Promise<unknown>;
}

// Get unique suggestions from previous services
function getUniqueSuggestions(services: OilServiceType[]) {
  const stations = [...new Set(services.map(s => s.stationName))];
  const brands = [...new Set(services.map(s => s.oilBrand))];
  return { stations, brands };
}

export function OilService({ services, currentMileage, settings, onAdd, onUpdateSettings }: OilServiceProps) {
  const [open, setOpen] = useState(false);
  const [stationName, setStationName] = useState('');
  const [oilBrand, setOilBrand] = useState('');
  const [dateOfChange, setDateOfChange] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mileageAtChange, setMileageAtChange] = useState(currentMileage);
  const [filterChanged, setFilterChanged] = useState(true);
  const [expiryMonths, setExpiryMonths] = useState(String(settings.oilExpiryMonths));
  const [rangeKm, setRangeKm] = useState(String(settings.oilRangeKm));
  const { saving, saveError, save } = useSaveAction();

  const latestService = services[services.length - 1];
  const previousServices = services.slice(0, -1).reverse();
  const suggestions = getUniqueSuggestions(services);

  // Pre-fill with last used values when opening dialog
  const handleOpenChange = (isOpen: boolean) => {
    if (saving) return;
    if (isOpen) {
      setMileageAtChange(currentMileage);
      setExpiryMonths(String(settings.oilExpiryMonths));
      setRangeKm(String(settings.oilRangeKm));
    }
    if (isOpen && latestService) {
      setStationName(latestService.stationName);
      setOilBrand(latestService.oilBrand);
    }
    setOpen(isOpen);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationName.trim() || !oilBrand.trim()) return;
    
    if (!await save(() => onAdd({
      stationName: stationName.trim(),
      oilBrand: oilBrand.trim(),
      dateOfChange,
      mileageAtChange,
      filterChanged,
    }))) return;
    
    setStationName('');
    setOilBrand('');
    setDateOfChange(format(new Date(), 'yyyy-MM-dd'));
    setMileageAtChange(currentMileage);
    setFilterChanged(true);
    setOpen(false);
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await save(() => onUpdateSettings({ oilExpiryMonths: Number(expiryMonths), oilRangeKm: Number(rangeKm) }))) setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-primary" />
          خدمة الزيت
        </CardTitle>
        <Dialog open={open} onOpenChange={handleOpenChange}>
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
                  <fieldset disabled={saving} className="contents">
                  <div className="space-y-2">
                    <Label>مكان التعبئة</Label>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pr-10"
                        placeholder="مثال: محطة الوحدة..."
                        value={stationName}
                        onChange={(e) => setStationName(e.target.value)}
                        list="station-suggestions"
                        required
                      />
                      {suggestions.stations.length > 0 && (
                        <datalist id="station-suggestions">
                          {suggestions.stations.map((s, i) => (
                            <option key={i} value={s} />
                          ))}
                        </datalist>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>نوع الزيت</Label>
                    <Input
                      placeholder="مثال: موبيل 1، كاسترول..."
                      value={oilBrand}
                      onChange={(e) => setOilBrand(e.target.value)}
                      list="brand-suggestions"
                      required
                    />
                    {suggestions.brands.length > 0 && (
                      <datalist id="brand-suggestions">
                        {suggestions.brands.map((b, i) => (
                          <option key={i} value={b} />
                        ))}
                      </datalist>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>التاريخ</Label>
                      <Input
                        type="date"
                        max={format(new Date(), 'yyyy-MM-dd')}
                        value={dateOfChange}
                        onChange={(e) => setDateOfChange(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>العداد (كم)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={Number.isNaN(mileageAtChange) ? '' : mileageAtChange}
                        onChange={(e) => setMileageAtChange(e.target.valueAsNumber)}
                        required
                      />
                    </div>
                  </div>
                  {/* Expected next oil change mileage badge */}
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-primary" />
                      العداد القادم المفروض لتغيير الزيت:
                    </span>
                    <span className="font-extrabold text-primary text-base dir-ltr">
                      {((mileageAtChange || 0) + (settings.oilRangeKm || 5000)).toLocaleString()} كم
                    </span>
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
                  {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
                  <Button type="submit" variant="gold" className="w-full" disabled={saving}>
                    {saving ? 'جاري الحفظ...' : 'حفظ الخدمة'}
                  </Button>
                  </fieldset>
                </form>
              </TabsContent>
              <TabsContent value="settings" className="space-y-4 mt-4">
                <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <fieldset disabled={saving} className="contents">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    فترة انتهاء الزيت (شهور)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    required
                    value={expiryMonths}
                    onChange={(e) => setExpiryMonths(e.target.value)}
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
                    required
                    value={rangeKm}
                    onChange={(e) => setRangeKm(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  سيتم تنبيهك قبل انتهاء أي من الحدين
                </p>
                {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
                <Button type="submit" variant="gold" className="w-full" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</Button>
                </fieldset>
                </form>
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

              {/* Next Expected Mileage Highlight Box */}
              <div className="flex items-center justify-between p-3 mb-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground">العداد القادم المفروض لتغيير الزيت:</span>
                </div>
                <span className="font-black text-sm text-primary tracking-wide">
                  {(latestService.mileageAtChange + settings.oilRangeKm).toLocaleString()} كم
                </span>
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
