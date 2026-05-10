import { useState } from 'react';
import { Gauge, Edit2, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MileageRecord } from '@/types/car';

interface MileageEditorProps {
  currentMileage: number;
  mileageHistory: MileageRecord[];
  onUpdate: (mileage: number) => void;
}

export function MileageEditor({ currentMileage, mileageHistory = [], onUpdate }: MileageEditorProps) {
  const [open, setOpen] = useState(false);
  const [mileage, setMileage] = useState(currentMileage);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mileage > 0) {
      onUpdate(mileage);
      setOpen(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setMileage(currentMileage);
    }
    setOpen(isOpen);
  };

  const sortedHistory = [...mileageHistory].reverse();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary">
          <Edit2 className="w-4 h-4" />
          تعديل
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gauge className="w-6 h-6 text-primary" />
            تعديل العداد
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="submit" variant="gold" className="w-full">
            حفظ التعديل
          </Button>
        </form>

        {sortedHistory.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <History className="w-4 h-4" />
              سجل تغييرات العداد
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {sortedHistory.map((record) => (
                <div key={record.id} className="flex justify-between items-center p-2 rounded-lg bg-secondary/50 text-sm">
                  <span className="font-bold">{record.mileage.toLocaleString()} كم</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(record.date).toLocaleDateString('ar-LY', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
