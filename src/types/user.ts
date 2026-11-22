export type UserRole = "customer" | "vendor" | "admin";
export type SubscriptionPlan = "free" | "premium";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  isBlocked: boolean;
  businessName?: string;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionExpiresAt?: string | null;
}
