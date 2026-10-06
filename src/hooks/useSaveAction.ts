import { useRef, useState } from 'react';
import { errorMessage } from '@/lib/backendError';

/** Keep the form and its values available until the server confirms the save. */
export function useSaveAction() {
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const save = async (action: () => Promise<unknown>) => {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    setSaveError('');
    try {
      await action();
      return true;
    } catch (error) {
      setSaveError(errorMessage(error, 'تعذر الحفظ. تحقق من الاتصال وحاول مجدداً.'));
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return { saving, saveError, save };
}
