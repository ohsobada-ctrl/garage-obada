import { useState, useEffect } from 'react';
import { Car, Bell, Plus, ChevronLeft, Gauge, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationService } from "@/services/notificationService";
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AddCarDialog } from '@/components/AddCarDialog';
import { ProfileDialog } from '@/components/ProfileDialog';
import { CarCard } from '@/components/CarCard';
import { NotificationCenter } from '@/components/NotificationCenter';
import { LegalVault } from '@/components/LegalVault';
import { OilService } from '@/components/OilService';
import { BrakesTires } from '@/components/BrakesTires';
import { MileagePrompt } from '@/components/MileagePrompt';
import { MileageEditor } from '@/components/MileageEditor';
import { useCarsSupabase } from '@/hooks/useCarsSupabase';
import { useNotifications, shouldShowMileagePrompt, markMileagePromptShown } from '@/hooks/useCars';
import { useAuth } from '@/lib/auth';
import { Car as CarType } from '@/types/car';
import { cn } from '@/lib/utils';
import { LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { AdminDashboard, getBroadcastNotifications } from '@/components/AdminDashboard';
import type { Notification } from '@/types/car';

const Index = () => {
  const { user, signOut } = useAuth();
  const { 
    cars, 
    isLoaded, 
    addCar, 
    deleteCar,
    addLegalDoc, 
    addOilService, 
    addBrakeTireService,
    updateMileage,
    updateCarSettings,
  } = useCarsSupabase();
  
  const notifications = useNotifications(cars);
  const [broadcasts, setBroadcasts] = useState<Notification[]>([]);
  const [selectedCar, setSelectedCar] = useState<CarType | null>(null);
  const [showMileagePrompt, setShowMileagePrompt] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [carToDelete, setCarToDelete] = useState<CarType | null>(null);

  useEffect(() => {
    const syncBroadcasts = () => {
      const stored = getBroadcastNotifications();
      const mapped: Notification[] = stored.map(b => ({
        id: b.id,
        carId: 'system',
        carName: `📢 ${b.title}`,
        type: 'legal',
        message: b.body,
        severity: b.severity,
        date: b.createdAt
      }));
      setBroadcasts(mapped);
    };

    syncBroadcasts();
    window.addEventListener('garage_new_broadcast', syncBroadcasts);
    return () => window.removeEventListener('garage_new_broadcast', syncBroadcasts);
  }, []);

  const allNotifications = [...broadcasts, ...notifications];

  // Schedule background notifications natively in the OS
  useEffect(() => {
    if (isLoaded && cars.length > 0) {
      NotificationService.scheduleBackgroundNotifications(cars);
    }
  }, [cars, isLoaded]);

  // Play sound + send immediate browser notifications on first load with active alerts
  useEffect(() => {
    if (!isLoaded || notifications.length === 0) return;

    // --- Sound: once per session ---
    const soundPlayed = sessionStorage.getItem('garage-alert-sound-played');
    if (!soundPlayed) {
      sessionStorage.setItem('garage-alert-sound-played', 'true');

      const playSound = () => {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          oscillator.connect(gain);
          gain.connect(ctx.destination);
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(660, ctx.currentTime);
          oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.6);
        } catch (_) { /* ignore */ }
      };

      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (ctx.state === 'running') {
          playSound();
        } else {
          const unlockAndPlay = () => { playSound(); };
          document.addEventListener('click', unlockAndPlay, { once: true });
          document.addEventListener('touchstart', unlockAndPlay, { once: true });
        }
      } catch (_) { /* ignore */ }
    }

    // --- Browser notifications: only for unseen alerts ---
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const shownKey = 'garage-shown-alerts';
      const shown: string[] = JSON.parse(localStorage.getItem(shownKey) || '[]');
      const newAlerts = notifications.filter(n => !shown.includes(n.id));
      if (newAlerts.length === 0) return;

      const topAlert = newAlerts[0];
      const body = newAlerts.length > 1
        ? `${topAlert.message} (+${newAlerts.length - 1} تنبيهات أخرى)`
        : topAlert.message;

      // Try Service Worker showNotification first (works on Android + desktop)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration('/').then(reg => {
          if (reg) {
            reg.showNotification(topAlert.carName, {
              body,
              icon: '/favicon.ico',
              tag: 'garage-active-alerts',
            }).catch(() => {
              // SW failed — fallback to direct (desktop only)
              try { new Notification(topAlert.carName, { body, icon: '/favicon.ico', tag: 'garage-active-alerts' }); } catch (_) {}
            });
          } else {
            // No SW registered — try direct (desktop only, Android may throw)
            try { new Notification(topAlert.carName, { body, icon: '/favicon.ico', tag: 'garage-active-alerts' }); } catch (_) {}
          }
        }).catch(() => {});
      } else {
        // No service worker support — desktop fallback
        try { new Notification(topAlert.carName, { body, icon: '/favicon.ico', tag: 'garage-active-alerts' }); } catch (_) {}
      }

      localStorage.setItem(shownKey, JSON.stringify([
        ...shown,
        ...newAlerts.map(n => n.id),
      ]));
    } catch (_) { /* ignore any unexpected errors */ }
  }, [isLoaded, notifications.length]);

  useEffect(() => {
    if (isLoaded && cars.length > 0 && shouldShowMileagePrompt()) {
      const timer = setTimeout(() => {
        setShowMileagePrompt(true);
        markMileagePromptShown();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, cars.length]);

  const handleDeleteCar = (car: CarType) => {
    setCarToDelete(car);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (carToDelete) {
      deleteCar(carToDelete.id);
      if (selectedCar?.id === carToDelete.id) {
        setSelectedCar(null);
      }
    }
    setDeleteDialogOpen(false);
    setCarToDelete(null);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">جاري التحميل...</div>
      </div>
    );
  }

  // Car Dashboard View
  if (selectedCar) {
    const car = cars.find(c => c.id === selectedCar.id) || selectedCar;
    const carNotifications = notifications.filter(n => n.carId === car.id);

    return (
      <div className="min-h-screen pb-8">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedCar(null)}
                className="gap-2"
              >
                العودة للمرآب
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="relative">
                      <Bell className="w-4 h-4" />
                      {carNotifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                          {carNotifications.length}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>التنبيهات</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      <NotificationCenter notifications={carNotifications} showHeader={false} />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </header>

        <main className="container pt-6 space-y-6">
          {/* Car Info Card */}
          <Card className="overflow-hidden">
            <div className="gradient-gold h-2" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                    <Car className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{car.make} {car.model}</h1>
                    <p className="text-muted-foreground">{car.year}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteCar(car)}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg">
                  <Gauge className="w-5 h-5 text-primary" />
                  <span className="font-bold">{car.currentMileage.toLocaleString()}</span>
                  <span className="text-muted-foreground">كم</span>
                </div>
                <MileageEditor
                  currentMileage={car.currentMileage}
                  mileageHistory={car.mileageHistory || []}
                  onUpdate={(mileage) => updateMileage(car.id, mileage)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <LegalVault 
            documents={car.legalDocs}
            onAdd={(doc) => addLegalDoc(car.id, doc)}
          />

          <OilService
            services={car.oilServices}
            currentMileage={car.currentMileage}
            settings={car.settings}
            onAdd={(service) => addOilService(car.id, service)}
            onUpdateSettings={(settings) => updateCarSettings(car.id, settings)}
          />

          <BrakesTires
            services={car.brakeTireServices}
            settings={car.settings}
            onAdd={(service) => addBrakeTireService(car.id, service)}
            onUpdateSettings={(settings) => updateCarSettings(car.id, settings)}
          />
                  {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent className="fixed left-[50%] top-[50%] z-[9999] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 font-tajawal text-right">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-xl font-bold">حذف السيارة</AlertDialogTitle>
      <AlertDialogDescription className="text-base pt-2 text-muted-foreground">
        هل أنت متأكد من حذف {carToDelete?.make} {carToDelete?.model}؟ 
        سيتم حذف جميع البيانات والسجلات المرتبطة بها نهائياً.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter className="flex flex-row-reverse gap-3 mt-6">
      <AlertDialogAction 
        onClick={confirmDelete} 
        className="bg-red-600 text-white hover:bg-red-700 flex-1 py-6 text-lg font-bold"
      >
        نعم، احذف السيارة
      </AlertDialogAction>
      <AlertDialogCancel className="flex-1 mt-0 py-6 text-lg">
        إلغاء
      </AlertDialogCancel>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
        </main>
      </div>
    );
  }
  // Garage View
  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center gold-glow-sm">
                <Car className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold">المرآب</h1>
            </div>
            <div className="flex items-center gap-3">
              <AdminDashboard carsCount={cars.length} />
              <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-muted-foreground hover:text-destructive">
                <LogOut className="w-5 h-5" />
              </Button>
              <ProfileDialog />
              <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="w-4 h-4" />
                  {allNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                      {allNotifications.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>مركز التنبيهات</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <NotificationCenter notifications={allNotifications} showHeader={false} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>

      <main className="container pt-6">
        {cars.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Car className="w-5 h-5 text-primary mb-1" />
                <p className="text-xl font-bold">{cars.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase">السيارات</p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/10">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Bell className="w-5 h-5 text-destructive mb-1" />
                <p className="text-xl font-bold">{notifications.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase">تنبيهات</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/50 border-border/40">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Gauge className="w-5 h-5 text-secondary-foreground mb-1" />
                <p className="text-xl font-bold">{(cars.reduce((acc, c) => acc + c.currentMileage, 0) / 1000).toFixed(1)}k</p>
                <p className="text-[10px] text-muted-foreground uppercase">إجمالي المسافة</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <ShieldCheck className="w-5 h-5 text-primary mb-1" />
                <p className="text-xl font-bold">{cars.reduce((acc, c) => acc + c.legalDocs.length, 0)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">وثائق</p>
              </CardContent>
            </Card>
          </div>
        )}

        {cars.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="w-24 h-24 rounded-2xl gradient-gold flex items-center justify-center mb-6 animate-float gold-glow">
              <Car className="w-12 h-12 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2 font-tajawal">مرحباً بك في المرآب!</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              أضف سيارتك الأولى وخليها تحت عينك دايماً. نذكرك بكل شي من التأمين للزيت!
            </p>
            <AddCarDialog onAdd={addCar} />
          </div>
        ) : (
          // Cars Grid
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">سياراتي ({cars.length})</h2>
              <AddCarDialog onAdd={addCar} />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cars.map((car, index) => (
                <div key={car.id} style={{ animationDelay: `${index * 100}ms` }}>
                  <CarCard
                    car={car}
                    notifications={notifications}
                    onClick={() => setSelectedCar(car)}
                  />
                </div>
              ))}
            </div>

            {/* Quick Notifications Preview */}
            {notifications.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  تنبيهات عاجلة
                </h3>
                <NotificationCenter notifications={notifications.slice(0, 3)} showHeader={false} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mileage Prompt */}
      <MileagePrompt
        cars={cars}
        open={showMileagePrompt}
        onClose={() => setShowMileagePrompt(false)}
        onUpdate={updateMileage}
      />

      
    </div>
  );
};

export default Index;
