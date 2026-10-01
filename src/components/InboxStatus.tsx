import { Button } from '@/components/ui/button';
import { isBackendSetupError, type BackendFailure } from '@/lib/backendError';

export function InboxStatus({ error, busy, retry }: { error: BackendFailure | null; busy: boolean; retry: () => void }) {
  if (!error) return null;
  return <div role="status" className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm flex flex-wrap items-center justify-between gap-2" dir="rtl">
    <p>{isBackendSetupError(error)
      ? 'الإشعارات العامة غير متاحة مؤقتاً؛ يلزم إكمال تحديث الخدمة. تنبيهات سياراتك متاحة.'
      : 'تعذر تحديث الإشعارات العامة. نعرض آخر بيانات متاحة حتى يعود الاتصال.'}</p>
    <Button variant="outline" size="sm" disabled={busy} onClick={retry}>{busy ? 'جاري التحقق...' : 'إعادة المحاولة'}</Button>
  </div>;
}
