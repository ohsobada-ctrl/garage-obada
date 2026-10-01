import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext, CustomUser } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { NotificationService } from '@/services/notificationService';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  useEffect(() => {
    let alive = true;
    let revision = 0;
    const restore = (sessionUser: User | null) => {
      const current = ++revision;
      if (!alive) return;
      if (!sessionUser) {
        setUser(null);
        queryClient.clear();
        setLoading(false);
        return;
      }
      setUser({ uid: sessionUser.id, email: sessionUser.email, phone: sessionUser.phone, isAdmin: false });
      setLoading(false);
      // Do not await Supabase calls inside its auth callback.
      setTimeout(() => {
        void supabase.rpc('is_garage_admin').then(({ data, error }) => {
          if (alive && revision === current) setUser(prev => prev && ({ ...prev, isAdmin: !error && data === true }));
        });
      }, 0);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => restore(session?.user ?? null));
    const initialRevision = revision;
    void supabase.auth.getSession().then(({ data }) => {
      if (revision === initialRevision) restore(data.session?.user ?? null);
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [queryClient]);

  const signOut = async () => {
    await NotificationService.disable();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    for (const key of ['garage_user_id', 'garage_user_email', 'garage_user_phone', 'garage_is_admin', 'garage_broadcast_notifications_store']) localStorage.removeItem(key);
    queryClient.clear();
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}
