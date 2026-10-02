import { useEffect, useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, X, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Notification } from '@/types/car';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  notifications: Notification[];
  onClose?: () => void;
  showHeader?: boolean;
  onRead?: (id: string) => Promise<void>;
  selectedId?: string | null;
}

export function NotificationCenter({ notifications, onClose, showHeader = true, onRead, selectedId }: NotificationCenterProps) {
  const [expanded, setExpanded] = useState<string | null>(selectedId || null);
  // Only an explicitly opened item is considered read; previews and hidden panels are not.
  useEffect(() => { if (selectedId) setExpanded(selectedId); }, [selectedId]);
  const openedUnreadId = notifications.find(item => item.id === expanded && item.carId === 'system' && !item.readAt)?.id;
  useEffect(() => {
    if (openedUnreadId && onRead) void onRead(openedUnreadId).catch(() => {});
  }, [expanded, openedUnreadId, onRead]);

  return <Card className="border-0 shadow-none bg-transparent" dir="rtl">
    {showHeader && <CardHeader className="flex flex-row items-center justify-between pb-3">
      <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" />التنبيهات</CardTitle>
      {onClose && <Button aria-label="إغلاق التنبيهات" variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>}
    </CardHeader>}
    <CardContent className={cn('px-0', !showHeader && 'pt-4')}>
      {notifications.length === 0 ? <div className="py-16 px-4 text-center space-y-3">
        <div className="mx-auto rounded-full bg-primary/10 p-5 w-fit"><Bell className="w-7 h-7 text-primary" /></div>
        <p className="font-semibold">كل شيء محدّث</p><p className="text-sm text-muted-foreground">تظهر هنا تنبيهات الصيانة ورسائل الإدارة.</p>
      </div> : <div className="space-y-2 max-h-[70dvh] overflow-y-auto">
        {notifications.map(item => {
          const isOpen = expanded === item.id;
          const unread = item.carId === 'system' && !item.readAt;
          const Icon = item.severity === 'danger' ? AlertTriangle : item.severity === 'warning' ? AlertCircle : Info;
          return <article key={item.id} className={cn('rounded-2xl border transition-colors overflow-hidden', unread ? 'border-primary/25 bg-primary/5' : 'border-border/60 bg-secondary/10')}>
            <button type="button" className="w-full p-4 text-right flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : item.id)}>
              <span className={cn('shrink-0 rounded-xl p-2', item.severity === 'danger' ? 'bg-destructive/10 text-destructive' : item.severity === 'warning' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary')}><Icon className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1 space-y-1 block">
                <span className="flex items-center gap-2"><span className="font-semibold text-sm break-words">{item.carName}</span>{unread && <span aria-label="غير مقروء" className="shrink-0 h-2 w-2 rounded-full bg-primary" />}</span>
                {!isOpen && <span className="text-sm text-muted-foreground line-clamp-2 break-words">{item.message}</span>}
                {item.carId === 'system' && <time className="block text-[11px] text-muted-foreground" dateTime={item.date}>{new Date(item.date).toLocaleString('ar-LY', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>}
              </span>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && <div className="px-4 pb-4 text-sm leading-7 whitespace-pre-wrap break-words">{item.message}</div>}
          </article>;
        })}
      </div>}
    </CardContent>
  </Card>;
}
