import { useEffect } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Notification } from '@/types/car';
import { cn } from '@/lib/utils';
import { LocalNotifications } from '@capacitor/local-notifications';

interface NotificationCenterProps {
  notifications: Notification[];
  onClose?: () => void;
  showHeader?: boolean;
}

export function NotificationCenter({ notifications, onClose, showHeader = true }: NotificationCenterProps) {
  
  // --- إضافة دالة إصدار الصوت عند وجود تنبيهات جديدة ---
  useEffect(() => {
    const playNotificationSound = async () => {
      if (notifications.length > 0) {
        // نأخذ آخر تنبيه وصل للقائمة
        const lastNotification = notifications[0]; 
        
        await LocalNotifications.schedule({
          notifications: [
            {
              title: lastNotification.carName,
              body: lastNotification.message,
              id: Date.now(),
              channelId: 'default-channel', // نفس القناة اللي درناها في App.tsx
              sound: 'default', // صوت الجهاز الافتراضي
            }
          ]
        });
      }
    };

    playNotificationSound();
  }, [notifications.length]); // يشتغل الكود فقط لما يتغير عدد التنبيهات
  // --------------------------------------------------

  const getSeverityIcon = (severity: Notification['severity']) => {
    switch (severity) {
      case 'danger':
        return <AlertTriangle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityStyles = (severity: Notification['severity']) => {
    switch (severity) {
      case 'danger':
        return 'border-destructive/50 bg-destructive/10 text-destructive';
      case 'warning':
        return 'border-warning/50 bg-warning/10 text-warning';
      default:
        return 'border-primary/50 bg-primary/10 text-primary';
    }
  };

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">ما في تنبيهات حالياً</p>
          <p className="text-sm text-muted-foreground mt-1">سياراتك بخير يا بطل! 🚗✨</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            التنبيهات ({notifications.length})
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(!showHeader && "pt-5")}>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "p-4 rounded-lg border flex items-start gap-3 animate-fade-in",
                getSeverityStyles(notification.severity)
              )}
            >
              <div className="shrink-0 mt-0.5">
                {getSeverityIcon(notification.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{notification.carName}</p>
                <p className="text-sm mt-1">{notification.message}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}