import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Car, Bell, Plus, ArrowRight, Gauge, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationService } from "@/services/notificationService";
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AddCarDialog } from '@/components/AddCarDialog';
import { CarCard } from '@/components/CarCard';
import { NotificationCenter } from '@/components/NotificationCenter';
import { SideDrawer } from '@/components/SideDrawer';
import { StatsGrid } from '@/components/StatsGrid';
import { LegalVault } from '@/components/LegalVault';
import { OilService } from '@/components/OilService';
import { BrakesTires } from '@/components/BrakesTires';
import { CustomReminders } from '@/components/CustomReminders';
import { useInbox } from '@/hooks/useInbox';
import { InboxStatus } from '@/components/InboxStatus';
import { backendError } from '@/lib/backendError';
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

import { supabase } from "@/integrations/supabase/client";

import type { Notification } from '@/types/car';

const Index = () => {
  const { user, signOut } = useAuth();
  const {
    cars,
    isLoaded,
    loadError,
    refetch,
    isFetching,
    addCar,
    deleteCar,
    addLegalDoc,
    addOilService,
    addBrakeTireService,
    updateMileage,
    updateCarSettings,
  } = useCarsSupabase();

  const notifications = useNotifications(cars);
  const inbox = useInbox();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const notificationId = searchParams.get('notification');
  useEffect(() => {
    if (notificationId) { setSelectedNotificationId(notificationId); setNotificationsOpen(true); }
  }, [notificationId]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      if (typeof notification.data?.id === 'string') { setSelectedNotificationId(notification.data.id); setNotificationsOpen(true); }
    });
    return () => { void listener.then(handle => handle.remove()); };
  }, []);
  const changeNotificationsOpen = (open: boolean) => {
    setNotificationsOpen(open);
    if (!open) {
      setSelectedNotificationId(null);
      if (notificationId) setSearchParams(prev => { prev.delete('notification'); return prev; }, { replace: true });
    }
  };
  const broadcasts = inbox.notifications;
  const [selectedCar, setSelectedCar] = useState<CarType | null>(null);
  const [showMileagePrompt, setShowMileagePrompt] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [carToDelete, setCarToDelete] = useState<CarType | null>(null);

  const allNotifications = [...broadcasts, ...notifications];
  const unreadCount = broadcasts.filter(item => !item.readAt).length + notifications.length;

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

  if (loadError && cars.length === 0) return <main dir="rtl" className="container py-12 space-y-4 text-center">
    <SideDrawer carsCount={0} />
    <h1 className="text-xl font-bold">تعذر تحميل سياراتك</h1>
    <p role="alert">{backendError(loadError, 'فشل جلب البيانات')}</p>
    <p className="text-sm text-muted-foreground">هذا لا يعني أن سياراتك انحذفت. أعد المحاولة بعد استعادة الاتصال.</p>
    <Button disabled={isFetching} onClick={() => void refetch()}>{isFetching ? 'جاري الاتصال...' : 'إعادة المحاولة'}</Button>
  </main>;

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
              <div className="flex items-center gap-3">
                <SideDrawer carsCount={cars.length} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCar(null)}
                  className="gap-2 font-bold hover:bg-secondary/50"
                >
                  <ArrowRight className="w-4 h-4 text-primary" />
                  العودة للمرآب
                </Button>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <Sheet open={notificationsOpen} onOpenChange={changeNotificationsOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="relative rounded-full bg-background/50 hover:bg-secondary/50 border-border/50">
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold shadow-sm">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>التنبيهات</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      <NotificationCenter notifications={allNotifications} showHeader={false} onRead={inbox.markRead} selectedId={selectedNotificationId} />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </header>

        <main className="container pt-6 space-y-6">
          <InboxStatus error={inbox.error} busy={inbox.isFetching} retry={() => void inbox.refetch()} />
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
          <CustomReminders carId={car.id} />
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
              <SideDrawer carsCount={cars.length} />
              <h1 className="text-xl font-bold tracking-tight">المرآب</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Sheet open={notificationsOpen} onOpenChange={changeNotificationsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative rounded-full bg-background/50 hover:bg-secondary/50 border-border/50">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>مركز التنبيهات</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <NotificationCenter notifications={allNotifications} showHeader={false} onRead={inbox.markRead} selectedId={selectedNotificationId} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="container pt-6 pb-24">
        <InboxStatus error={inbox.error} busy={inbox.isFetching} retry={() => void inbox.refetch()} />
        {cars.length > 0 && (
          <>
            <StatsGrid cars={cars} notifications={notifications} />

            <div className="mb-6">
              <AddCarDialog onAdd={addCar}>
                <Button className="w-full h-14 text-lg font-bold gradient-gold text-primary-foreground rounded-2xl shadow-lg gold-glow hover:scale-[1.02] transition-transform">
                  <Plus className="w-6 h-6 ml-2" />
                  أضف سيارة جديدة
                </Button>
              </AddCarDialog>
            </div>
          </>
        )}

        {cars.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
            <div className="w-28 h-28 rounded-3xl gradient-gold flex items-center justify-center mb-8 animate-float gold-glow">
              <Car className="w-14 h-14 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3 font-tajawal">مرحباً بك في المرآب!</h2>
            <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
              أضف سيارتك الأولى وخليها تحت عينك دايماً. نذكرك بكل شي من التأمين للزيت!
            </p>
            <AddCarDialog onAdd={addCar}>
              <Button className="h-14 px-8 text-lg font-bold gradient-gold text-primary-foreground rounded-2xl shadow-lg gold-glow hover:scale-[1.02] transition-transform">
                <Plus className="w-6 h-6 ml-2" />
                أضف سيارتك الأولى
              </Button>
            </AddCarDialog>
          </div>
        ) : (
          // Cars Grid
          <div className="space-y-4">
            <h2 className="text-lg font-bold">سياراتي</h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cars.map((car, index) => (
                <div key={car.id} style={{ animationDelay: `${index * 100}ms` }}>
                  <CarCard
                    car={car}
                    notifications={notifications}
                    onClick={() => setSelectedCar(car)}
                    onDelete={() => handleDeleteCar(car)}
                  />
                </div>
              ))}
            </div>

            {/* Quick Notifications Preview */}
            {notifications.length > 0 && (
              <div className="mt-6 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
                <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-destructive">
                  <Bell className="w-5 h-5" />
                  تنبيهات عاجلة ({notifications.length})
                </h3>
                <NotificationCenter notifications={notifications.slice(0, 3)} showHeader={false} />
              </div>
            )}
          </div>
        )}
      </main>

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

