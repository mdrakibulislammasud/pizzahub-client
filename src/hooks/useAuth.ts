"use client";

import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import type { AppUser, UserRole } from "@/types/user";

export function useAuth() {
  const session = authClient.useSession();
  const user = session.data?.user as unknown as AppUser | undefined;

  return useMemo(() => ({
    user,
    isLoading: session.isPending,
    isAuthenticated: Boolean(user),
    role: user?.role,
    hasRole: (role: UserRole) => user?.role === role,
    refetch: session.refetch
  }), [user, session.isPending, session.refetch]);
}
