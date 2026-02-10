import { useEffect, useRef } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Notification } from '@/types/car';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// صوت تنبيه بسيط باستخدام Web Audio API
function playBeepSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn('تعذر تشغيل صوت التنبيه:', e);
  }
}

interface NotificationCenterProps {
  notifications: Notification[];
  onClose?: () => void;
  showHeader?: boolean;
}

export function NotificationCenter({ notifications, onClose, showHeader = true }: NotificationCenterProps) {
  
  const prevCountRef = useRef(notifications.length);

  useEffect(() => {
    // يشتغل فقط لما يزيد عدد التنبيهات (تنبيه جديد)
    if (notifications.length > 0 && notifications.length !== prevCountRef.current) {
      const lastNotification = notifications[0];

      if (Capacitor.isNativePlatform()) {
        // على الجهاز: إشعار نظام حقيقي
        LocalNotifications.schedule({
          notifications: [{
            title: lastNotification.carName,
            body: lastNotification.message,
            id: Date.now(),
            channelId: 'default-channel',
            sound: 'default',
          }]
        }).catch(console.error);
      } else {
        // في المتصفح: صوت بيب
        playBeepSound();
      }
    }
    prevCountRef.current = notifications.length;
  }, [notifications.length]);

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