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
    return stored === "true";
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
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    const restoreUserSession = (sessionUser?: any) => {
      try {
        if (sessionUser) {
          const userEmail = sessionUser.email || localStorage.getItem("garage_user_email") || undefined;
          if (userEmail) localStorage.setItem("garage_user_email", userEmail);
          localStorage.setItem("garage_user_id", sessionUser.id);

          const isAdmin = checkAdminStatus(userEmail);
          setUser({
            uid: sessionUser.id,
            phoneNumber: sessionUser.phone || sessionUser.user_metadata?.phone || localStorage.getItem("garage_user_phone") || undefined,
            phone: sessionUser.phone || sessionUser.user_metadata?.phone || localStorage.getItem("garage_user_phone") || undefined,
            email: userEmail,
            role: isAdmin ? "admin" : "user",
            isAdmin: isAdmin,
          });
          setLoading(false);
          return true;
        }

        // Check local storage fallback for offline / persistent login
        const savedId = localStorage.getItem("garage_user_id");
        const savedEmail = localStorage.getItem("garage_user_email") || undefined;
        const savedPhone = localStorage.getItem("garage_user_phone") || undefined;

        if (savedId) {
          const isAdmin = checkAdminStatus(savedEmail);
          setUser({
            uid: savedId,
            phoneNumber: savedPhone,
            phone: savedPhone,
            email: savedEmail,
            role: isAdmin ? "admin" : "user",
            isAdmin: isAdmin,
          });
          setLoading(false);
          return true;
        }

        setUser(null);
        setLoading(false);
        return false;
      } catch (err) {
        console.error("Auth session error:", err);
        setLoading(false);
        return false;
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      restoreUserSession(session?.user);
    }).catch(() => {
      restoreUserSession();
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem("garage_user_id");
        localStorage.removeItem("garage_user_email");
        localStorage.removeItem("garage_user_phone");
        localStorage.removeItem("garage_is_admin");
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        restoreUserSession(session.user);
      }
    });

    return () => {
      clearTimeout(timer);
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
