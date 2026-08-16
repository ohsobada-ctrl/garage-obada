import { createContext, useContext } from "react";

export type CustomUser = {
  uid: string;
  phoneNumber?: string;
  phone?: string;
  email?: string;
  role?: 'admin' | 'user';
  isAdmin?: boolean;
};

export type AuthState = {
  user: CustomUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  toggleAdmin?: (status?: boolean) => void;
};

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);
