import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthUser = {
  customerID: number;
  username: string;
  role: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  setSession: (token: string, profile: AuthUser) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const parseStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem("user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(() => parseStoredUser());
  const [loading, setLoading] = useState<boolean>(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      clearSession();
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Not authenticated");
      }

      const data = await res.json();
      const profile: AuthUser = {
        customerID: data.customerID,
        username: data.username,
        role: data.role,
      };
      localStorage.setItem("user", JSON.stringify(profile));
      setUser(profile);
    } catch {
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const setSession = useCallback((token: string, profile: AuthUser) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(profile));
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      clearSession();
      return;
    }

    fetchProfile().finally(() => setLoading(false));
  }, [clearSession, fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      setSession,
      refreshUser,
      logout,
    }),
    [user, loading, setSession, refreshUser, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
