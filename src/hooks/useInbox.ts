import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { Notification } from '@/types/car';
import { NotificationService } from '@/services/notificationService';
import { toast } from 'sonner';

export function useInbox(): Notification[] {
  const { user } = useAuth();
  const client = useQueryClient();
  const { data = [], error } = useQuery({
    queryKey: ['inbox', user?.uid], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_inbox').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    }, refetchInterval: 30000,
  });
  useEffect(() => { if (error) toast.error('تعذر تحديث صندوق الإشعارات، سنعيد المحاولة تلقائياً'); }, [error]);
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`inbox:${user.uid}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_inbox', filter: `user_id=eq.${user.uid}` }, () => {
      void client.invalidateQueries({ queryKey: ['inbox', user.uid] });
    }).subscribe();
    if (localStorage.getItem('garage_push_enabled') === 'true') {
      void NotificationService.enable(false).catch(() => toast.warning('تعذر تجديد تسجيل إشعارات هذا الجهاز. راجع إعدادات الإشعارات'));
    }
    return () => { void supabase.removeChannel(channel); };
  }, [user?.uid, client]);
  return data.map(row => ({ id: row.id, carId: 'system', carName: row.title, message: row.body, type: 'legal', severity: row.severity, date: row.created_at }));
}
