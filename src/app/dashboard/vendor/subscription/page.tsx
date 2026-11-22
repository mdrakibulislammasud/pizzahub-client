
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  motion,
  MotionConfig,
} from "motion/react";

import { toast } from "sonner";

import {
  Crown,
  Store,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  CalendarDays,
  Lock,
  XCircle,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  businessName?: string;
  isBlocked?: boolean;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
}

interface Subscription {
  subscriptionPlan: string;
  subscriptionExpiresAt?: string | null;
}

async function getSession(
  signal?: AbortSignal
): Promise<User | null> {

  const response = await fetch(
    `${API}/api/auth/get-session?disableCookieCache=true`,
    {
      credentials: "include",
      cache: "no-store",
      signal,
    }
  );

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to verify session.");
  }

  const result = await response.json();

  return result?.user ?? null;
}

async function getToken(
  signal?: AbortSignal
) {

  const response = await fetch(
    `${API}/api/auth/token`,
    {
      credentials: "include",
      cache: "no-store",
      signal,
    }
  );

  const result = await response.json()
    .catch(() => null);

  if (!response.ok || !result?.token) {
    throw new Error("Authentication failed.");
  }

  return result.token as string;
}

function formatDate(value?: string | null) {

  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SubscriptionPage() {
  const [clockNow, setClockNow] = useState(0);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      setClockNow(clockNow);
    }, 0);

    const intervalTimer = window.setInterval(() => {
      setClockNow(clockNow);
    }, 60000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
    };
  }, []);


  const [user, setUser] =
    useState<User | null>(null);

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [checkoutLoading, setCheckoutLoading] =
    useState(false);

  const [accessDenied, setAccessDenied] =
    useState(false);

  const [error, setError] =
    useState("");

  const checkoutLock = useRef(false);

  // ========================================
  // LOAD VERIFIED SUBSCRIPTION
  // ========================================

  async function loadSubscription(
    signal?: AbortSignal
  ) {

    const currentUser = await getSession(signal);

    if (signal?.aborted) return;

    if (!currentUser) {

      window.location.assign("/sign-in");

      return;

    }

    if (
      currentUser.role !== "vendor" ||
      currentUser.isBlocked
    ) {

      setUser(null);
      setSubscription(null);
      setAccessDenied(true);

      return;

    }

    setAccessDenied(false);
    setUser(currentUser);

    const token = await getToken(signal);

    const response = await fetch(
      `${API}/api/vendor/overview`,
      {
        credentials: "include",
        cache: "no-store",
        signal,

        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json()
      .catch(() => null);

    if (!response.ok || result?.success === false) {

      throw new Error(
        result?.message ||
        "Unable to load subscription."
      );

    }

    const data = result?.data ?? result;

    const plan =
      data?.subscriptionPlan ??
      data?.subscription?.subscriptionPlan;

    const expiresAt =
      data?.subscriptionExpiresAt ??
      data?.subscription?.subscriptionExpiresAt ??
      null;

    if (
      plan !== "free" &&
      plan !== "premium"
    ) {

      throw new Error(
        "Unable to verify the current plan."
      );

    }

    if (!signal?.aborted) {

      setSubscription({
        subscriptionPlan: plan,
        subscriptionExpiresAt: expiresAt,
      });

    }

  }

  // ========================================
  // INITIALIZATION
  // ========================================

  useEffect(() => {

    const controller = new AbortController();

    async function initialize() {

      try {

        await loadSubscription(
          controller.signal
        );

      } catch (err) {

        if (!controller.signal.aborted) {

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load subscription."
          );

        }

      } finally {

        if (!controller.signal.aborted) {
          setLoading(false);
        }

      }

    }

    initialize();

    return () => controller.abort();

  }, []);

  // ========================================
  // CURRENT PLAN
  // ========================================

  const isPremium =
    subscription?.subscriptionPlan === "premium" &&
    !!subscription.subscriptionExpiresAt &&
    new Date(
      subscription.subscriptionExpiresAt
    ).getTime() > clockNow;

  // ========================================
  // REFRESH SUBSCRIPTION
  // ========================================

  async function refresh() {

    if (refreshing || checkoutLoading) return;

    try {

      setRefreshing(true);
      setError("");

      await loadSubscription();

    } catch (err) {

      const message =
        err instanceof Error
          ? err.message
          : "Refresh failed.";

      setError(message);

      toast.error(message);

    } finally {

      setRefreshing(false);

    }

  }

  // ========================================
  // STRIPE CHECKOUT
  // ========================================

  async function upgradeToPremium() {

    if (
      !user ||
      !subscription ||
      isPremium ||
      error ||
      refreshing ||
      checkoutLock.current
    ) {
      return;
    }

    checkoutLock.current = true;

    setCheckoutLoading(true);
    setError("");

    let redirecting = false;

    try {

      const currentUser = await getSession();

      if (!currentUser) {

        window.location.assign("/sign-in");

        return;

      }

      if (
        currentUser.id !== user.id ||
        currentUser.role !== "vendor" ||
        currentUser.isBlocked
      ) {

        throw new Error(
          "Only active vendors can upgrade."
        );

      }

      const token = await getToken();

      const response = await fetch(
        `${API}/api/subscriptions/checkout`,
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({}),
        }
      );

      const result = await response.json()
        .catch(() => null);

      if (!response.ok || result?.success === false) {

        throw new Error(
          result?.message ||
          "Unable to create checkout session."
        );

      }

      const checkoutUrl =
        result?.data?.url;

      if (!checkoutUrl) {

        throw new Error(
          "Stripe checkout URL is missing."
        );

      }

      const url = new URL(checkoutUrl);

      if (
        url.protocol !== "https:" ||
        url.hostname !== "checkout.stripe.com"
      ) {

        throw new Error(
          "Invalid Stripe checkout URL."
        );

      }

      toast.success(
        "Redirecting to secure checkout..."
      );

      redirecting = true;

      window.location.assign(url.href);

    } catch (err) {

      const message =
        err instanceof Error
          ? err.message
          : "Unable to connect with Stripe.";

      setError(message);

      toast.error(message);

    } finally {

      if (!redirecting) {

        checkoutLock.current = false;

        setCheckoutLoading(false);

      }

    }

  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {

    return (

      <main className="grid min-h-screen place-items-center bg-[#080808] text-white">

        <div className="text-center">

          <LoaderCircle
            size={40}
            className="mx-auto animate-spin text-[#E51B23]"
          />

          <p className="mt-5">
            Loading subscription...
          </p>

        </div>

      </main>

    );

  }

  // ========================================
  // ACCESS CONTROL
  // ========================================

  if (accessDenied || !user) {

    return (

      <main className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white">

        <div className="max-w-md text-center">

          <ShieldCheck
            size={60}
            className="mx-auto text-[#E51B23]"
          />

          <h1 className="mt-6 text-3xl font-bold">

            {accessDenied
              ? "Access Denied"
              : "Subscription Unavailable"}

          </h1>

          <p className="mt-4 leading-7">

            {accessDenied
              ? "Only active vendor accounts can manage subscriptions."
              : error || "Please sign in."}

          </p>

          <Link
            href="/"
            className="mt-7 inline-flex rounded-xl bg-[#C9151B] px-7 py-3 font-bold"
          >

            Back to Home

          </Link>

        </div>

      </main>

    );

  }

  const freeFeatures = [
    "Maximum 3 active menu items",
    "Vendor dashboard access",
    "Customer order management",
    "Restaurant profile management",
  ];

  const premiumFeatures = [
    "Unlimited active menu items",
    "Premium vendor badge",
    "Featured homepage placement",
    "All Free plan features",
  ];

  // ========================================
  // SUBSCRIPTION USER INTERFACE
  // ========================================

  return (

    <MotionConfig reducedMotion="user">

      <div className="min-h-screen bg-[#080808] text-white">

        {/* NAVBAR */}

        <header className="sticky top-0 z-40 border-b border-[#351010] bg-[#0B0B0B]">

          <nav className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-4 px-5">

            <Link
              href="/"
              className="flex items-center gap-3"
            >

              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#C9151B] font-serif text-3xl font-bold italic ph-brand-mark">

                P

              </span>

              <span className="font-serif text-3xl font-bold">

                Pizza

                <span className="text-[#E51B23]">
                  Hub.
                </span>

              </span>

            </Link>

            <Link
              href="/dashboard/vendor"
              className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF4545]"
            >

              <ArrowLeft size={18} />

              Vendor Dashboard

            </Link>

          </nav>

        </header>

        <main className="mx-auto max-w-6xl px-5 py-12 lg:py-20">

          {/* PAGE HEADING */}

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >

            <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl border border-[#351010] bg-[#141414]">

              <Crown
                size={42}
                className="text-[#E51B23]"
              />

            </div>

            <p className="mt-6 text-xs font-bold tracking-widest text-[#FF4545]">

              PIZZAHUB PREMIUM

            </p>

            <h1 className="mt-4 font-serif text-4xl font-bold sm:text-6xl">

              Grow Your Restaurant.

            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/80">

              Unlock unlimited menu items and premium
              restaurant features with PizzaHub Premium.

            </p>

          </motion.div>

          {/* CURRENT SUBSCRIPTION */}

          <section className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#351010] bg-[#141414] p-6">

            <div>

              <p className="text-sm text-white/70">
                Your Current Plan
              </p>

              <h2 className="mt-2 text-2xl font-bold text-[#FF4545]">

                {!subscription
                  ? "Unverified"
                  : isPremium
                    ? "Premium"
                    : "Free"}

              </h2>

              {isPremium && (

                <p className="mt-3 flex items-center gap-2 text-sm">

                  <CalendarDays size={17} />

                  Expires:{" "}

                  {formatDate(
                    subscription?.subscriptionExpiresAt
                  )}

                </p>

              )}

            </div>

            <button
              type="button"
              onClick={refresh}
              disabled={
                refreshing || checkoutLoading
              }
              className="flex items-center gap-2 rounded-xl border border-[#351010] bg-[#080808] px-5 py-3 text-sm font-semibold hover:border-[#E51B23] disabled:opacity-50"
            >

              <RefreshCw
                size={18}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />

              Refresh Plan

            </button>

          </section>

          {/* ERROR MESSAGE */}

          {error && (

            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-xl border border-[#E51B23] bg-[#1C0808] p-5 text-sm text-[#FF7777]"
            >

              <XCircle
                size={20}
                className="shrink-0"
              />

              <div>

                <p>{error}</p>

                <button
                  onClick={refresh}
                  disabled={refreshing}
                  className="mt-3 font-semibold underline"
                >

                  Try Again

                </button>

              </div>

            </div>

          )}

          {/* PRICING CARDS */}

          <div className="mt-10 grid gap-7 md:grid-cols-2">

            {/* FREE PLAN */}

            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col rounded-3xl border border-[#351010] bg-[#141414] p-8"
            >

              <Store
                size={36}
                className="text-[#FF4545]"
              />

              <h2 className="mt-6 text-3xl font-bold">

                Free Plan

              </h2>

              <p className="mt-3 text-sm text-white/70">

                Everything you need to get started.

              </p>

              <div className="mt-6 flex items-end gap-2">

                <span className="text-5xl font-bold">

                  $0

                </span>

                <span className="pb-1 text-sm text-white/60">

                  / month

                </span>

              </div>

              <div className="my-7 border-t border-[#351010]" />

              <div className="space-y-5">

                {freeFeatures.map(feature => (

                  <div
                    key={feature}
                    className="flex items-start gap-3 text-sm"
                  >

                    <CheckCircle2
                      size={20}
                      className="shrink-0 text-[#FF4545]"
                    />

                    <span>{feature}</span>

                  </div>

                ))}

              </div>

              <div className="mt-auto pt-9">

                <div className="rounded-xl border border-[#351010] bg-[#080808] py-4 text-center font-bold">

                  {subscription && !isPremium
                    ? "Current Plan"
                    : "Free Plan"}

                </div>

              </div>

            </motion.article>

            {/* PREMIUM PLAN */}

            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative flex flex-col rounded-3xl border border-[#E51B23] bg-[#141414] p-8"
            >

              <div className="absolute right-6 top-6 rounded-full bg-[#C9151B] px-4 py-2 text-xs font-bold">

                PREMIUM

              </div>

              <Crown
                size={38}
                className="text-[#E51B23]"
              />

              <h2 className="mt-6 text-3xl font-bold">

                Premium Plan

              </h2>

              <p className="mt-3 text-sm text-white/70">

                More opportunities for your restaurant.

              </p>

              <div className="mt-6 flex items-end gap-2">

                <span className="text-5xl font-bold text-[#FF4545]">

                  $9.99

                </span>

                <span className="pb-1 text-sm text-white/60">

                  / month

                </span>

              </div>

              <div className="my-7 border-t border-[#351010]" />

              <div className="space-y-5">

                {premiumFeatures.map(feature => (

                  <div
                    key={feature}
                    className="flex items-start gap-3 text-sm"
                  >

                    <CheckCircle2
                      size={20}
                      className="shrink-0 text-[#FF4545]"
                    />

                    <span>{feature}</span>

                  </div>

                ))}

              </div>

              <div className="mt-auto pt-9">

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  disabled={
                    isPremium ||
                    checkoutLoading ||
                    refreshing ||
                    !subscription ||
                    !!error
                  }
                  onClick={upgradeToPremium}
                  className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#C9151B] px-5 py-4 font-bold transition hover:bg-[#E51B23] disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {checkoutLoading ? (

                    <>

                      <LoaderCircle
                        size={20}
                        className="animate-spin"
                      />

                      Connecting to Stripe...

                    </>

                  ) : isPremium ? (

                    <>

                      <CheckCircle2 size={20} />

                      Premium Activated

                    </>

                  ) : (

                    <>

                      <CreditCard size={20} />

                      Upgrade to Premium

                      <ArrowRight size={18} />

                    </>

                  )}

                </motion.button>

              </div>

            </motion.article>

          </div>

          {/* PAYMENT SECURITY */}

          <section className="mt-10 rounded-2xl border border-[#351010] bg-[#101010] p-7">

            <div className="flex items-start gap-4">

              <ShieldCheck
                size={35}
                className="shrink-0 text-[#E51B23]"
              />

              <div>

                <h2 className="text-xl font-bold">

                  Secure Payment

                </h2>

                <p className="mt-3 text-sm leading-7 text-white/70">

                  Payments are processed securely by
                  Stripe. Your Premium plan will only
                  become active after the server verifies
                  your payment.

                </p>

                <p className="mt-3 flex items-center gap-2 text-xs text-white/60">

                  <Lock size={15} />

                  Card details are never stored by PizzaHub.

                </p>

              </div>

            </div>

          </section>

        </main>

        <footer className="border-t border-[#351010] px-5 py-8 text-center text-sm text-white/60">

          PizzaHub. All rights reserved.

        </footer>

      </div>

    </MotionConfig>

  );

}
