import { useEffect, useState } from "react";
import { AuthContext, CustomUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const isSessionActive = sessionStorage.getItem("session_active") === "true";
      const rememberMe = localStorage.getItem("remember_me") !== "false";

      if (!isSessionActive && !rememberMe) {
        // Tab was closed and reopened, and user didn't want to be remembered
        await supabase.auth.signOut();
        localStorage.removeItem("garage_user_phone");
        localStorage.removeItem("garage_user_id");
      }

      sessionStorage.setItem("session_active", "true");

      const { data: { session } } = await supabase.auth.getSession();
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
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
