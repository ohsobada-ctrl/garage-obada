import { useEffect, useState } from "react";
import { AuthContext, CustomUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          uid: session.user.id,
          phoneNumber: session.user.phone || session.user.user_metadata?.phone || undefined,
          phone: session.user.phone || session.user.user_metadata?.phone || undefined,
          email: session.user.email || undefined,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    // IMPORTANT: We ignore SIGNED_OUT events that happen transiently (e.g. when
    // the Android app comes back from background and the token is mid-refresh).
    // We verify the session is truly gone before clearing the user.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Double-check that there truly is no session before clearing the user
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session) {
            setUser(null);
            setLoading(false);
          }
        });
        return;
      }

      if (session?.user) {
        setUser({
          uid: session.user.id,
          phoneNumber: session.user.phone || session.user.user_metadata?.phone || undefined,
          phone: session.user.phone || session.user.user_metadata?.phone || undefined,
          email: session.user.email || undefined,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("garage_user_phone");
    localStorage.removeItem("garage_user_id");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
