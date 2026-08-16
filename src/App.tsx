import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NotificationService } from "@/services/notificationService";
import { AuthProvider } from "@/components/AuthProvider";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { saveBroadcastNotification } from "@/components/AdminDashboard";
import { LocalNotifications } from "@capacitor/local-notifications";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-primary">جاري التحقق...</div>
    </div>
  );
  
  if (!user) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
};

const App = () => {
  useEffect(() => {
    NotificationService.createChannel();
    NotificationService.requestPermissions();
    NotificationService.initPushNotifications();

    // Top-level global broadcast listener for ALL devices/users (guest or logged-in)
    const processedIds = new Set<string>();

    const channel = supabase
      .channel('garage_global_broadcasts')
      .on('broadcast', { event: 'new_admin_notification' }, (payload) => {
        if (payload.payload) {
          const item = payload.payload;

          // Prevent duplicate execution/scheduling of the same notification
          if (processedIds.has(item.id)) return;
          processedIds.add(item.id);

          saveBroadcastNotification(item);

          // Trigger native notification with sound or browser alert
          if (Capacitor.isNativePlatform()) {
            let numericId = 1000;
            for (let i = 0; i < item.id.length; i++) {
              numericId = (numericId + item.id.charCodeAt(i)) % 2147483647;
            }

            LocalNotifications.schedule({
              notifications: [{
                id: numericId,
                title: `📢 ${item.title}`,
                body: item.body,
                schedule: { at: new Date(Date.now() + 100) },
                sound: 'default',
                channelId: 'default-channel-v3',
                ongoing: false,
                autoCancel: true,
              }]
            }).catch(() => {});
          } else if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`📢 ${item.title}`, {
                body: item.body,
                icon: '/favicon.ico',
                tag: item.id
              });
            } catch (_) {}
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;