import { useEffect, useState } from "react";
import { AuthContext, CustomUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = (): boolean => {
    const stored = localStorage.getItem("garage_is_admin");
    // Default to true for the current active user so they get full Admin access as requested
    return stored === null ? true : stored === "true";
  };

  const toggleAdmin = (status?: boolean) => {
    setUser((prev) => {
      if (!prev) return null;
      const nextAdminState = status !== undefined ? status : !prev.isAdmin;
      localStorage.setItem("garage_is_admin", nextAdminState ? "true" : "false");
      return {
        ...prev,
        isAdmin: nextAdminState,
        role: nextAdminState ? "admin" : "user",
      };
    });
  };

  useEffect(() => {
    const isAdmin = checkAdminStatus();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          uid: session.user.id,
          phoneNumber: session.user.phone || session.user.user_metadata?.phone || undefined,
          phone: session.user.phone || session.user.user_metadata?.phone || undefined,
          email: session.user.email || undefined,
          role: isAdmin ? "admin" : "user",
          isAdmin: isAdmin,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session) {
            setUser(null);
            setLoading(false);
          }
        });
        return;
      }

      if (session?.user) {
        const currentAdmin = checkAdminStatus();
        setUser({
          uid: session.user.id,
          phoneNumber: session.user.phone || session.user.user_metadata?.phone || undefined,
          phone: session.user.phone || session.user.user_metadata?.phone || undefined,
          email: session.user.email || undefined,
          role: currentAdmin ? "admin" : "user",
          isAdmin: currentAdmin,
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
    <AuthContext.Provider value={{ user, loading, signOut, toggleAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
