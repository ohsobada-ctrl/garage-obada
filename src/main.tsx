import { createRoot } from "react-dom/client";
import { resolveClientSupabaseConfig } from './lib/supabaseConfig';
import "./index.css";

const root = createRoot(document.getElementById('root')!);
try {
  resolveClientSupabaseConfig(import.meta.env);
  root.render(<main dir="rtl" className="p-8 text-center">جاري فتح التطبيق...</main>);
  void import('./App.tsx').then(({ default: App }) => root.render(<App />)).catch(() => {
    root.render(<main dir="rtl" className="p-8 text-center"><p>تعذر تحميل التطبيق. تحقق من الاتصال ثم حدّث الصفحة.</p><button onClick={() => location.reload()}>إعادة المحاولة</button></main>);
  });
} catch (error) {
  root.render(<main dir="rtl" className="p-8 text-center space-y-4"><h1>تعذر الاتصال بالخدمة</h1><p>{error instanceof Error ? error.message : 'راجع إعدادات نشر التطبيق.'}</p></main>);
}
