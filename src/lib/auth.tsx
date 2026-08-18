"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  api,
  decodeJwt,
  isExpired,
  registerUnauthorizedHandler,
  tokenStore,
} from "./api";
import type {
  JwtClaims,
  PasswordChange,
  ProfileUpdate,
  Role,
  TokenPair,
  UserRead,
} from "./types";

const PROFILE_KEY = "rcp.profile";
const WS_URL =
  process.env.NEXT_PUBLIC_RTO_WS_URL?.replace(/\/$/, "") ||
  `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000"}`
    .replace(/^http:/, "ws:")
    .replace(/^https:/, "wss:") + "/ws";

export interface SessionProfile {
  id?: string;
  tenant_id?: string | null;
  email: string;
  full_name?: string;
  phone?: string | null;
  user_type?: UserRead["user_type"];
  status?: string;
  roles?: Role[];
  tenantSlug: string;
}

export interface AuthState {
  claims: JwtClaims | null;
  profile: SessionProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  roles: Role[];
  hasRole: (...roles: Role[]) => boolean;
  login: (
    tenantSlug: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  updateProfile: (body: ProfileUpdate) => Promise<SessionProfile>;
  changePassword: (body: PasswordChange) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// load user's profile info(name, email)
function loadProfile(): SessionProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as SessionProfile) : null;
  } catch {
    return null;
  }
}

// save user's profile info(name, email)
function saveProfile(profile: SessionProfile | null) {
  if (typeof window === "undefined") return;
  if (!profile) {
    window.localStorage.removeItem(PROFILE_KEY);
    return;
  }
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function mergeProfile(
  current: SessionProfile | null,
  user: UserRead,
  tenantSlug?: string,
): SessionProfile {
  return {
    id: user.id,
    tenant_id: user.tenant_id,
    tenantSlug: tenantSlug ?? current?.tenantSlug ?? "",
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    user_type: user.user_type,
    status: user.status,
    roles: user.roles,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [claims, setClaims] = useState<JwtClaims | null>(null);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<WebSocket | null>(null);

  const forceLogout = useCallback(() => {
    tokenStore.clear();
    if (typeof window !== "undefined")
      window.localStorage.removeItem(PROFILE_KEY);
    setClaims(null);
    setProfile(null);
    if (typeof window !== "undefined") {
      window.alert("Your account has been disabled. You will be signed out now.");
    }
    router.replace("/login");
  }, [router]);

  const logout = useCallback(() => {
    forceLogout();
  }, [forceLogout]);

  useEffect(() => {
    registerUnauthorizedHandler(forceLogout);
  }, [forceLogout]);

  useEffect(() => {
    if (!claims || socketRef.current) return;

    const accessToken = tokenStore.access;
    if (!accessToken) return;

    const socketUrl = new URL(WS_URL);
    socketUrl.searchParams.set("token", accessToken);

    const socket = new WebSocket(socketUrl.toString());
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as {
          type?: string;
          reason?: string;
        };

        if (message.type === "force_logout") {
          forceLogout();
        }
      } catch {
        // Ignore non-JSON frames.
      }
    };

    socket.onclose = () => {
      socketRef.current = null;
    };

    socket.onerror = () => {
      socket.close();
    };

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [claims, forceLogout]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = tokenStore.access;
      const decoded = token ? decodeJwt(token) : null;
      const stored = loadProfile();

      if (decoded && !isExpired(decoded)) {
        setClaims(decoded);
        setProfile(stored);
        try {
          const user = await api.get<UserRead>("/api/auth/me");
          if (cancelled) return;
          const merged = mergeProfile(stored, user, stored?.tenantSlug);
          setProfile(merged);
          saveProfile(merged);
        } catch {
          // Keep the cached profile if the bootstrap fetch fails.
        }
      } else if (token) {
        // Access token expired — the API layer will refresh lazily; keep the
        // decoded (stale) claims so the shell renders, unless clearly invalid.
        setClaims(decoded);
        setProfile(stored);
      }

      if (!cancelled) setIsLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (tenantSlug: string, email: string, password: string) => {
      // Ask backend for tokens
      const pair = await api.post<TokenPair>(
        "/api/auth/login",
        { tenant_slug: tenantSlug, email, password },
        { auth: false },
      );
      tokenStore.set(pair);  // save tokens in localStorage
      const decoded = decodeJwt(pair.access_token);  // decode to get roles/id
      // Ask backend for user info
      const user = await api.get<UserRead>("/api/auth/me");
      const prof = mergeProfile({ tenantSlug, email }, user, tenantSlug);
      saveProfile(prof);
      setClaims(decoded);
      setProfile(prof);
    },
    [],
  );

  const updateProfile = useCallback(
    async (body: ProfileUpdate) => {
      const user = await api.patch<UserRead>("/api/auth/me", body);
      let nextProfile: SessionProfile | null = null;
      setProfile((current) => {
        nextProfile = mergeProfile(current, user, current?.tenantSlug);
        saveProfile(nextProfile);
        return nextProfile;
      });
      return nextProfile ?? mergeProfile(profile, user, profile?.tenantSlug);
    },
    [profile],
  );

  const changePassword = useCallback(async (body: PasswordChange) => {
    await api.post<{ message: string }>("/api/auth/me/change-password", body);
  }, []);

  const value = useMemo<AuthState>(() => {
    const roles = claims?.roles ?? [];
    return {
      claims,
      profile,
      isAuthenticated: !!claims,
      isLoading,
      roles,
      hasRole: (...want: Role[]) => want.some((r) => roles.includes(r)),
      login,
      logout,
      updateProfile,
      changePassword,
    };
  }, [claims, profile, isLoading, login, logout, updateProfile, changePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
