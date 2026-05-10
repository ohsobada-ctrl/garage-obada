import { useState } from 'react';
import { Gauge, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car } from '@/types/car';

interface MileagePromptProps {
  cars: Car[];
  open: boolean;
  onClose: () => void;
  onUpdate: (carId: string, mileage: number) => void;
}

export function MileagePrompt({ cars, open, onClose, onUpdate }: MileagePromptProps) {
  const [selectedCar, setSelectedCar] = useState(cars[0]?.id || '');
  const [mileage, setMileage] = useState(cars[0]?.currentMileage || 0);

  const handleCarChange = (carId: string) => {
    setSelectedCar(carId);
    const car = cars.find(c => c.id === carId);
    if (car) setMileage(car.currentMileage);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCar && mileage > 0) {
      onUpdate(selectedCar, mileage);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
              value={mileage}
              onChange={(e) => setMileage(parseInt(e.target.value) || 0)}
              className="text-center text-xl font-bold"
              required
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              لاحقاً
            </Button>
            <Button type="submit" variant="gold" className="flex-1">
              تحديث
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
