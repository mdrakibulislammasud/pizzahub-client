
import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";
import { env } from "@/lib/env";

export const authClient = createAuthClient({
  baseURL: `${env.apiUrl}/api/auth`,
  plugins: [jwtClient()],
  fetchOptions: {
    credentials: "include",
  },
});

export type AppRole = "customer" | "vendor" | "admin";
