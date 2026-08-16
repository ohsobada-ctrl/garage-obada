import { useEffect, useState } from "react";
import { AuthContext, CustomUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = (userEmail?: string): boolean => {
    const adminEmail = "ohsobada@gmail.com";
    if (userEmail && userEmail.toLowerCase().trim() === adminEmail) {
      return true;
    }
    const savedEmail = localStorage.getItem("garage_user_email");
    if (savedEmail && savedEmail.toLowerCase().trim() === adminEmail) {
      return true;
    }
    const stored = localStorage.getItem("garage_is_admin");
    // If explicitly set in localStorage allow it, otherwise default to true if email matches or if no email is set yet
    return stored === "true" || (stored === null && (!userEmail || userEmail.toLowerCase().trim() === adminEmail));
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
        const userEmail = session.user.email || undefined;
        const isAdmin = checkAdminStatus(userEmail);
        setUser({
          uid: session.user.id,
          phoneNumber: session.user.phone || session.user.user_metadata?.phone || undefined,
          phone: session.user.phone || session.user.user_metadata?.phone || undefined,
          email: userEmail,
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
        const userEmail = session.user.email || undefined;
        const currentAdmin = checkAdminStatus(userEmail);
        setUser({
          uid: session.user.id,
          phoneNumber: session.user.phone || session.user.user_metadata?.phone || undefined,
          phone: session.user.phone || session.user.user_metadata?.phone || undefined,
          email: userEmail,
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
