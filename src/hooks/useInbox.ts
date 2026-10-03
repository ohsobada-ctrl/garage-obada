import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { Notification } from '@/types/car';
import { NotificationService } from '@/services/notificationService';
import { isBackendSetupError, shouldRetryBackend } from '@/lib/backendError';

export function useInbox() {
  const { user } = useAuth();
  const userId = user?.uid;
  const client = useQueryClient();
  const reading = useRef(new Set<string>());
  const { data = [], error, refetch, isFetching } = useQuery({
    queryKey: ['inbox', userId], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_inbox').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
    retry: shouldRetryBackend,
    refetchInterval: query => isBackendSetupError(query.state.error) ? false : 30000,
  });
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`inbox:${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notification_inbox', filter: `user_id=eq.${userId}` }, () => {
      void client.invalidateQueries({ queryKey: ['inbox', userId] });
    }).subscribe();
    if (localStorage.getItem('garage_push_enabled') === 'true') {
      void NotificationService.enable(false).catch(() => window.dispatchEvent(new Event('garage_push_changed')));
    }
    return () => { void supabase.removeChannel(channel); };
  }, [userId, client]);
  const markRead = useCallback(async (id: string) => {
    if (!userId || reading.current.has(id)) return;
    reading.current.add(id);
    try {
      const { data: updated, error } = await supabase.from('notification_inbox')
        .update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId)
        .is('read_at', null).select('id,read_at').maybeSingle();
      // Reading should never interrupt the user. Keep the unread state on failure.
      if (error) return;
      if (updated) client.setQueryData(['inbox', userId], (rows: typeof data | undefined) => rows?.map(row => row.id === id ? { ...row, read_at: updated.read_at } : row));
      else void client.invalidateQueries({ queryKey: ['inbox', userId] });
    } finally { reading.current.delete(id); }
  }, [userId, client]);
  const notifications: Notification[] = data.map(row => ({ id: row.id, carId: 'system', carName: row.title, message: row.body, type: 'legal', severity: row.severity, date: row.created_at, readAt: row.read_at }));
  return { notifications, error, refetch, isFetching, markRead };
}
