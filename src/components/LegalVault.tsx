import { useState } from 'react';
import { FileText, Calendar, Shield, Car as CarIcon, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LegalDocument, legalDocLabels } from '@/types/car';
import { cn } from '@/lib/utils';

interface LegalVaultProps {
  documents: LegalDocument[];
  onAdd: (doc: Omit<LegalDocument, 'id'>) => void;
}

const docIcons = {
  insurance: Shield,
  roadTax: CarIcon,
  technicalInspection: FileText,
};

export function LegalVault({ documents, onAdd }: LegalVaultProps) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<LegalDocument['type']>('insurance');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  const getDocStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) return { status: 'danger', text: `منتهية من ${Math.abs(daysRemaining)} يوم`, days: daysRemaining };
    if (daysRemaining <= 7) return { status: 'warning', text: `${daysRemaining} يوم متبقي`, days: daysRemaining };
    if (daysRemaining <= 30) return { status: 'warning', text: `${daysRemaining} يوم متبقي`, days: daysRemaining };
    return { status: 'safe', text: `${daysRemaining} يوم متبقي`, days: daysRemaining };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expiryDate) return;
    
    onAdd({ type: docType, expiryDate, notes: notes.trim() || undefined });
    setExpiryDate('');
    setNotes('');
    setOpen(false);
  };

  const docTypes: LegalDocument['type'][] = ['insurance', 'roadTax', 'technicalInspection'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          الأوراق القانونية
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="goldOutline" size="sm">
              <Plus className="w-4 h-4" />
              إضافة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة وثيقة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>نوع الوثيقة</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as LegalDocument['type'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {docTypes.map(type => (
                      <SelectItem key={type} value={type}>{legalDocLabels[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات (اختياري)</Label>
                <Input
                  placeholder="أي ملاحظات إضافية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button type="submit" variant="gold" className="w-full">
                حفظ الوثيقة
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {docTypes.map(type => {
            const doc = documents.find(d => d.type === type);
            const Icon = docIcons[type];
            const status = doc ? getDocStatus(doc.expiryDate) : null;
            
            return (
              <div
                key={type}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  doc ? (
                    status?.status === 'danger' ? 'border-destructive/50 bg-destructive/5' :
                    status?.status === 'warning' ? 'border-warning/50 bg-warning/5' :
                    'border-success/50 bg-success/5'
                  ) : 'border-dashed border-muted-foreground/30'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      doc ? (
                        status?.status === 'danger' ? 'bg-destructive/20' :
                        status?.status === 'warning' ? 'bg-warning/20' :
                        'bg-success/20'
                      ) : 'bg-muted'
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        doc ? (
                          status?.status === 'danger' ? 'text-destructive' :
                          status?.status === 'warning' ? 'text-warning' :
                          'text-success'
                        ) : 'text-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <p className="font-medium">{legalDocLabels[type]}</p>
                      {doc ? (
                        <p className={cn(
                          "text-sm",
                          status?.status === 'danger' ? 'text-destructive' :
                          status?.status === 'warning' ? 'text-warning' :
                          'text-success'
                        )}>
                          {status?.text}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">غير مضاف</p>
                      )}
                    </div>
                  </div>
                  {doc && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(doc.expiryDate).toLocaleDateString('ar-LY')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
