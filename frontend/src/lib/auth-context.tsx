import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, loginUser, registerUser } from "../api/auth";
import { setAuthToken } from "../api/client";
import type { Role, User } from "../types";

const TOKEN_KEY = "tooloftools_token";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: { username: string; password: string; role: Role; team?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthToken(token);
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }
    getCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login: async (username: string, password: string) => {
        const data = await loginUser({ username, password });
        localStorage.setItem(TOKEN_KEY, data.access_token);
        setToken(data.access_token);
      },
      register: async (payload) => {
        await registerUser(payload);
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      },
    }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

