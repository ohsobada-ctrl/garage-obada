import { useState, useEffect } from 'react';
import { Car, Bell, Plus, ChevronLeft, Gauge, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AddCarDialog } from '@/components/AddCarDialog';
import { CarCard } from '@/components/CarCard';
import { NotificationCenter } from '@/components/NotificationCenter';
import { LegalVault } from '@/components/LegalVault';
import { OilService } from '@/components/OilService';
import { BrakesTires } from '@/components/BrakesTires';
import { MileagePrompt } from '@/components/MileagePrompt';
import { MileageEditor } from '@/components/MileageEditor';
import { useCars, useNotifications, shouldShowMileagePrompt, markMileagePromptShown } from '@/hooks/useCars';
import { Car as CarType } from '@/types/car';
import { cn } from '@/lib/utils';
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

const Index = () => {
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
  } = useCars();
  
  const notifications = useNotifications(cars);
  const [selectedCar, setSelectedCar] = useState<CarType | null>(null);
  const [showMileagePrompt, setShowMileagePrompt] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [carToDelete, setCarToDelete] = useState<CarType | null>(null);

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
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>مركز التنبيهات</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <NotificationCenter notifications={notifications} showHeader={false} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="container pt-6">
        {cars.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-24 h-24 rounded-2xl gradient-gold flex items-center justify-center mb-6 animate-float gold-glow">
              <Car className="w-12 h-12 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">مرحباً بك في المرآب!</h2>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف السيارة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف {carToDelete?.make} {carToDelete?.model}؟ 
              سيتم حذف جميع البيانات والسجلات المرتبطة بها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
