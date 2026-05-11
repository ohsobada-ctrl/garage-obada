import { useEffect, useState } from "react";
import { AuthContext, CustomUser } from "@/lib/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التحقق من وجود جلسة في localStorage
    const storedPhone = localStorage.getItem("garage_user_phone");
    const storedId = localStorage.getItem("garage_user_id");

    if (storedPhone && storedId) {
      setUser({
        uid: storedId,
        phoneNumber: storedPhone,
        phone: storedPhone
      });
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const signOut = async () => {
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
