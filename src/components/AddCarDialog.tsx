import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Car } from 'lucide-react';

interface AddCarDialogProps {
  // تأكد أن الأنواع هنا تتوافق مع ما تريده في قاعدة البيانات
  onAdd: (car: { make: string; model: string; year: number; currentMileage: number }) => void;
}

export function AddCarDialog({ onAdd }: AddCarDialogProps) {
  const [open, setOpen] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  // نبقيها نصوصاً هنا لسهولة المسح والـ Placeholder
  const [year, setYear] = useState<string>("");
  const [mileage, setMileage] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!make.trim() || !model.trim()) return;
    
    onAdd({
      make: make.trim(),
      model: model.trim(),
      // التصحيح: تحويل النص إلى رقم عند الإرسال فقط
      year: Number(year),
      currentMileage: Number(mileage),
    });
    
    // إعادة تعيين الحقول
    setMake('');
    setModel('');
    setYear('');
    setMileage('');
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
          <DialogTitle className="flex items-center gap-3 text-xl font-tajawal">
            <Car className="w-6 h-6 text-garage-gold" />
            سيارة جديدة
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4 font-tajawal">
          <div className="space-y-2 text-right">
            <Label htmlFor="make">الشركة المصنعة</Label>
            <Input
              id="make"
              placeholder="مثال: تويوتا، هيونداي..."
              value={make}
              onChange={(e) => setMake(e.target.value)}
              required
              className="text-right"
            />
          </div>
          <div className="space-y-2 text-right">
            <Label htmlFor="model">الموديل</Label>
            <Input
              id="model"
              placeholder="مثال: كامري، النترا..."
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
              className="text-right"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right">
                <Label htmlFor="year">سنة الصنع</Label>
                <Input
                  id="year"
                  type="number"
                  min={1990}
                  max={new Date().getFullYear() + 1}
                  placeholder="2025" 
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                  className="text-right"
                />
              </div>
              <div className="space-y-2 text-right">
                <Label htmlFor="mileage">العداد (كم)</Label>
                <Input
                  id="mileage"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  required
                  className="text-right"
                />
              </div>
          </div>
          <Button type="submit" variant="gold" className="w-full font-bold" size="lg">
            أضف السيارة
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
