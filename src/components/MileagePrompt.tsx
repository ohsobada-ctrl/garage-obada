import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car } from '@/types/car';
import { useSaveAction } from '@/hooks/useSaveAction';

interface MileagePromptProps {
  cars: Car[];
  open: boolean;
  onClose: () => void;
  onUpdate: (carId: string, mileage: number) => Promise<unknown>;
}

export function MileagePrompt({ cars, open, onClose, onUpdate }: MileagePromptProps) {
  const [selectedCar, setSelectedCar] = useState(cars[0]?.id || '');
  const [mileage, setMileage] = useState(cars[0]?.currentMileage || 0);
  const { saving, saveError, save } = useSaveAction();

  useEffect(() => {
    if (!cars.some(car => car.id === selectedCar)) {
      setSelectedCar(cars[0]?.id || '');
      setMileage(cars[0]?.currentMileage || 0);
    }
  }, [cars, selectedCar]);

  const handleCarChange = (carId: string) => {
    setSelectedCar(carId);
    const car = cars.find(c => c.id === carId);
    if (car) setMileage(car.currentMileage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCar && Number.isSafeInteger(mileage) && mileage >= 0 && await save(() => onUpdate(selectedCar, mileage))) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!value && !saving) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gauge className="w-6 h-6 text-primary" />
            تحديث العداد
          </DialogTitle>
        </DialogHeader>
        <div className="text-center py-4">
          <p className="text-lg font-medium text-primary mb-2">
            يا بطل! 👋
          </p>
          <p className="text-muted-foreground">
            سيارتك تبي شوية دلال، العداد كم وصل توه؟
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={saving} className="contents">
          {cars.length > 1 && (
            <div className="space-y-2">
              <Label>اختر السيارة</Label>
              <Select value={selectedCar} onValueChange={handleCarChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر سيارة" />
                </SelectTrigger>
                <SelectContent>
                  {cars.map(car => (
                    <SelectItem key={car.id} value={car.id}>
                      {car.make} {car.model} ({car.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>العداد الحالي (كم)</Label>
            <Input
              type="number"
              min={0}
              value={Number.isNaN(mileage) ? '' : mileage}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                setMileage(Number.isNaN(parsed) ? e.target.valueAsNumber : parsed);
              }}
              className="text-center text-xl font-bold"
              required
            />
          </div>
          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              لاحقاً
            </Button>
            <Button type="submit" variant="gold" className="flex-1" disabled={saving || !selectedCar}>
              {saving ? 'جاري الحفظ...' : 'تحديث'}
            </Button>
          </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
