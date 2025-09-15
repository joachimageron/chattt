"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { gqlFetch, AUTH_QUERIES } from "@/utils/graphqlClient";
import { addToast } from "@heroui/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface User {
  id: string;
  email: string;
  name?: string | null;
}

interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}
interface RegisterInput {
  email: string;
  password: string;
  name?: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PUBLIC_PATHS = [
  "/auth/signin",
  "/auth/register",
  "/auth/forgot_password",
  "/auth/verify-email",
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleError = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;
    addToast({
      title: "Erreur",
      description: message,
      color: "danger",
    });
  };

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await gqlFetch<{ me: { user: User } }>(AUTH_QUERIES.ME);
      setUser(data.me.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Chargement initial de la session
    void refresh();

    // Set up automatic token refresh every 23 hours for long-lived tokens
    // and every 30 minutes for short-lived tokens
    const setupTokenRefresh = () => {
      // Try to refresh token every 30 minutes to detect if we have a long-lived token
      const interval = setInterval(async () => {
        if (user) {
          try {
            await refreshToken();
          } catch {
            console.log("Token refresh failed, user needs to re-login");
          }
        }
      }, 30 * 60 * 1000); // 30 minutes

      return () => clearInterval(interval);
    };

    const cleanup = setupTokenRefresh();
    return cleanup;
  }, [refresh, refreshToken, user]);

  const login = useCallback(async (input: LoginInput): Promise<User> => {
    try {
      setIsLoading(true);
      const data = await gqlFetch<{ login: { user: User } }>(
        AUTH_QUERIES.LOGIN,
        { loginInput: input }
      );
      setUser(data.login.user);
      addToast({
        title: "Connecté",
        description: "Connexion réussie",
        color: "success",
      });
      return data.login.user;
    } catch (err) {
      handleError(err, "Login failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (input: RegisterInput): Promise<User> => {
      try {
        setIsLoading(true);
        const data = await gqlFetch<{ createUser: User }>(
          AUTH_QUERIES.REGISTER,
          {
            createUserInput: input,
          }
        );
        addToast({
          title: "Compte créé",
          description: "Inscription réussie",
          color: "success",
        });
        // login automatique (on attend pour être sûr que user est set)
        await login({ email: input.email, password: input.password });
        return data.createUser;
      } catch (err) {
        handleError(err, "Registration failed");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [login]
  );

  const refreshToken = useCallback(async () => {
    try {
      const data = await gqlFetch<{ refreshToken: { user: User; refreshed: boolean } }>(
        AUTH_QUERIES.REFRESH_TOKEN
      );
      setUser(data.refreshToken.user);
    } catch {
      // If refresh fails, user needs to login again
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await gqlFetch<{ logout: { success: boolean } }>(AUTH_QUERIES.LOGOUT);
      setUser(null);
      addToast({
        title: "Déconnecté",
        description: "Vous êtes déconnecté",
        color: "default",
      });
    } catch (err) {
      handleError(err, "Logout failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      if (pathname && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        const target = `/auth/signin?from=${encodeURIComponent(pathname)}`;
        if (window.location.pathname !== "/auth/signin") {
          router.replace(target);
        }
      }
    }
  }, [user, isLoading, pathname, router]);

  // Redirection centralisée après login (depuis page signin)
  useEffect(() => {
    if (user && pathname === "/auth/signin") {
      const from = searchParams?.get("from");
      let dest = "/";
      if (from && from.startsWith("/") && !from.startsWith("/auth/"))
        dest = from;
      if (dest !== pathname) router.replace(dest);
    }
  }, [user, pathname, router, searchParams]);

  const value: AuthContextValue = {
    user,
    isLoading,
    login,
    register,
    logout,
    refresh,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
