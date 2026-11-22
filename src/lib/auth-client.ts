import { createAuthClient } from "better-auth/react";
import { env } from "@/lib/env";

/** Better Auth client points directly to the existing Express auth handler. */
export const authClient = createAuthClient({
  baseURL: `${env.apiUrl}/api/auth`,
  fetchOptions: {
    credentials: "include"
  }
});

export type AppRole = "customer" | "vendor" | "admin";
