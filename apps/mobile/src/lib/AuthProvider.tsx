import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { clearToken, loadToken, saveToken } from "./session";

type Status = "loading" | "anon" | "needs-onboarding" | "ready";

type AuthValue = {
  status: Status;
  signIn: (email: string, password: string, mode: "login" | "register") => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (payload: unknown) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");

  const refresh = async () => {
    const token = await loadToken();
    if (!token) {
      setStatus("anon");
      return;
    }
    try {
      const me = await api.me();
      setStatus(me.onboardingComplete ? "ready" : "needs-onboarding");
    } catch {
      await clearToken();
      setStatus("anon");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      refresh,
      signIn: async (email, password, mode) => {
        const result = mode === "register" ? await api.register(email, password) : await api.login(email, password);
        await saveToken(result.token);
        setStatus(result.onboardingComplete ? "ready" : "needs-onboarding");
      },
      signOut: async () => {
        await clearToken();
        setStatus("anon");
      },
      completeOnboarding: async (payload) => {
        await api.onboard(payload);
        setStatus("ready");
      },
    }),
    [status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
