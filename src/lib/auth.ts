import { createContext, useContext } from "react";

export type CustomUser = {
  uid: string;
  phoneNumber?: string;
  phone?: string;
};

export type AuthState = {
  user: CustomUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);
