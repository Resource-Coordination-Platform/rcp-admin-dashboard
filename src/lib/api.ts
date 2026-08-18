import type { JwtClaims, TokenPair } from "./types";

// set the base url for fastapi backend
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

const ACCESS_KEY = "rcp.access_token";
const REFRESH_KEY = "rcp.refresh_token";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

// ---- token storage (browser only) ----
export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  set(pair: TokenPair) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCESS_KEY, pair.access_token);
    window.localStorage.setItem(REFRESH_KEY, pair.refresh_token);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

export function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(
      decodeURIComponent(
        json
          .split("")
          .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join(""),
      ),
    ) as JwtClaims;
  } catch {
    return null;
  }
}

export function isExpired(claims: JwtClaims | null, skewSeconds = 30): boolean {
  if (!claims) return true;
  return claims.exp * 1000 < Date.now() + skewSeconds * 1000;
}

// A callback the auth provider registers so the client can force a logout.
let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) return null;
      const pair = (await res.json()) as TokenPair;
      tokenStore.set(pair);
      return pair.access_token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(
  path: string,
  query?: RequestOptions["query"],
): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

async function parseError(res: Response): Promise<never> {
  let detail = res.statusText || "Request failed";
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") detail = data.detail;
    else if (Array.isArray(data?.detail))
      detail = data.detail.map((d: any) => d.msg ?? d).join(", ");
  } catch {
    /* non-JSON body */
  }
  throw new ApiError(res.status, detail);
}

async function doFetch<T>(
  path: string,
  opts: RequestOptions,
  isRetry = false,
): Promise<T> {
  const { method = "GET", body, query, auth = true, signal } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = tokenStore.access;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 401 && auth && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) return doFetch<T>(path, opts, true);
    tokenStore.clear();
    onUnauthorized?.();
    throw new ApiError(401, "Session expired. Please sign in again.");
  }

  if (!res.ok) return parseError(res);

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    doFetch<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    doFetch<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    doFetch<T>(path, { ...opts, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    doFetch<T>(path, { ...opts, method: "PUT", body }),
  del: <T>(path: string, opts?: RequestOptions) =>
    doFetch<T>(path, { ...opts, method: "DELETE" }),
};
