import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Car } from 'lucide-react';

interface AddCarDialogProps {
  onAdd: (car: { make: string; model: string; year: number; currentMileage: number }) => void;
}

export function AddCarDialog({ onAdd }: AddCarDialogProps) {
  const [open, setOpen] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [mileage, setMileage] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!make.trim() || !model.trim()) return;
    
    onAdd({
      make: make.trim(),
      model: model.trim(),
      year,
      currentMileage: mileage,
    });
    
    setMake('');
    setModel('');
    setYear(new Date().getFullYear());
    setMileage(0);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold" size="lg" className="gap-3">
          <Plus className="w-5 h-5" />
          أضف سيارة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Car className="w-6 h-6 text-primary" />
            سيارة جديدة
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="make">الشركة المصنعة</Label>
            <Input
              id="make"
              placeholder="مثال: تويوتا، هيونداي، نيسان..."
              value={make}
              onChange={(e) => setMake(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">الموديل</Label>
            <Input
              id="model"
              placeholder="مثال: كامري، النترا، صني..."
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">سنة الصنع</Label>
              <Input
                id="year"
                type="number"
                min={1990}
                max={new Date().getFullYear() + 1}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mileage">العداد (كم)</Label>
              <Input
                id="mileage"
                type="number"
                min={0}
                value={mileage}
                onChange={(e) => setMileage(parseInt(e.target.value) || 0)}
                required
              />
            </div>
          </div>
          <Button type="submit" variant="gold" className="w-full" size="lg">
            أضف السيارة
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
