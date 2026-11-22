import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/env";

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ApiErrorBody {
  success?: boolean;
  message?: string;
  errors?: unknown;
}

type AuthenticatedConfig = InternalAxiosRequestConfig & { requiresAuth?: boolean };

/** Public API client for endpoints that do not require a JWT. */
export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
  timeout: 15_000
});

/** Authenticated API client. JWT is obtained from the existing Better Auth JWT plugin. */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
  timeout: 15_000
});

api.interceptors.request.use(async (config: AuthenticatedConfig) => {
  if (config.requiresAuth === false) return config;

  const response = await fetch(`${API_BASE_URL}/auth/token`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? "Please sign in to continue." : "Unable to refresh your session token.");
  }

  const payload: { token?: string } = await response.json();
  if (!payload.token) throw new Error("The authentication server did not return a JWT.");

  config.headers.set("Authorization", `Bearer ${payload.token}`);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 403) {
      const message = error.response.data?.message;
      if (typeof window !== "undefined" && message?.toLowerCase().includes("blocked")) {
        window.dispatchEvent(new CustomEvent("pizzahub:account-blocked", { detail: message }));
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export const apiRoutes = {
  auth: { token: "/auth/token" },
  menu: { list: "/menu", details: (id: string) => `/menu/${id}`, vendorItems: "/menu/vendor/my-items" },
  orders: {
    create: "/orders",
    customerOverview: "/orders/customer/overview",
    mine: "/orders/my-orders",
    cancel: (id: string) => `/orders/${id}/cancel`,
    vendorOrders: "/orders/vendor/my-orders",
    updateVendorStatus: (id: string) => `/orders/vendor/${id}/status`
  },
  vendor: { overview: "/vendor/overview" },
  profile: "/profile",
  admin: {
    overview: "/admin/overview",
    users: "/admin/users",
    blockUser: (id: string) => `/admin/users/${id}/block`,
    menuItems: "/admin/menu-items",
    updateMenuStatus: (id: string) => `/admin/menu-items/${id}/status`,
    transactions: "/admin/transactions"
  },
  subscriptions: { checkout: "/subscriptions/checkout" }
} as const;
