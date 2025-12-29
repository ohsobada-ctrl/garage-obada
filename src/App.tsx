import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LocalNotifications } from '@capacitor/local-notifications'; // تأكد من تثبيت المكتبة
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // 1. طلب إذن الإشعارات من المستخدم (مهم جداً للآيفون وأندرويد 13+)
        const permission = await LocalNotifications.requestPermissions();
        
        if (permission.display === 'granted') {
          // 2. إنشاء قناة إشعارات للأندرويد (هذا ما يضمن صدور الصوت الافتراضي)
          await LocalNotifications.createChannel({
            id: 'default-channel',
            name: 'تنبيهات السيارة',
            description: 'إشعارات الصيانة الدورية والأوراق القانونية',
            importance: 5, // أعلى درجة لضمان ظهور الإشعار وصوت التنبيه
            visibility: 1,
            sound: 'default', // استخدام صوت الجهاز الافتراضي
            vibration: true,
          });
          console.log("تم إعداد نظام الإشعارات بنجاح");
        }
      } catch (error) {
        console.error("خطأ في إعداد الإشعارات:", error);
      }
    };

    setupNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;