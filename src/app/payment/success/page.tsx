
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  motion,
  MotionConfig,
} from "motion/react";

import {
  CheckCircle2,
  Crown,
  Check,
  ShieldCheck,
  ArrowRight,
  Home,
  LayoutDashboard,
  LoaderCircle,
  Lock,
  AlertCircle,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const features = [
  "Unlimited menu items",
  "Premium vendor badge",
  "Featured menu placement",
  "Restaurant management",
  "All Free plan features",
];

export default function PaymentSuccessPage() {

  const [loading, setLoading] = useState(true);

  const [allowed, setAllowed] = useState(false);

  const [error, setError] = useState("");

  // VERIFY VENDOR SESSION

  useEffect(() => {

    const controller = new AbortController();

    async function verifySession() {

      try {

        const response = await fetch(
          `${API}/api/auth/get-session?disableCookieCache=true`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (controller.signal.aborted) return;

        if (response.status === 401) {

          window.location.assign("/sign-in");
          return;

        }

        if (!response.ok) {

          throw new Error(
            "Unable to verify your account."
          );

        }

        const session = await response.json();

        if (controller.signal.aborted) return;

        if (!session?.user) {

          window.location.assign("/sign-in");
          return;

        }

        if (
          session.user.role !== "vendor" ||
          session.user.isBlocked
        ) {

          throw new Error(
            "Only active vendors can access this page."
          );

        }

        setAllowed(true);

      } catch (err) {

        if (!controller.signal.aborted) {

          setError(
            err instanceof Error
              ? err.message
              : "Unable to verify session."
          );

        }

      } finally {

        if (!controller.signal.aborted) {
          setLoading(false);
        }

      }
    }

    verifySession();

    return () => controller.abort();

  }, []);

  // LOADING SCREEN

  if (loading) {

    return (

      <main className="grid min-h-screen place-items-center bg-[#080808] text-white">

        <div className="text-center">

          <LoaderCircle
            size={42}
            className="mx-auto animate-spin text-[#E51B23]"
          />

          <p className="mt-5 text-sm">
            Verifying your account...
          </p>

        </div>

      </main>

    );

  }

  // ACCESS CONTROL

  if (!allowed) {

    return (

      <main className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white">

        <div className="w-full max-w-md rounded-3xl border border-[#351010] bg-[#141414] p-8 text-center">

          <AlertCircle
            size={55}
            className="mx-auto text-[#E51B23]"
          />

          <h1 className="mt-5 text-3xl font-bold">
            Page Unavailable
          </h1>

          <p className="mt-4 text-sm leading-7 text-white/80">
            {error || "Please sign in again."}
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex rounded-xl bg-[#C9151B] px-7 py-4 font-bold"
          >
            Back to Home
          </Link>

        </div>

      </main>

    );

  }

  return (

    <MotionConfig reducedMotion="user">

      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#080808] px-5 py-12 text-white">

        {/* BACKGROUND LIGHTING */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-48 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#E51B23]/10 blur-[150px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -right-40 h-[450px] w-[450px] rounded-full bg-[#E51B23]/5 blur-[120px]"
        />

        {/* BRAND LOGO */}

        <Link
          href="/"
          className="relative mb-9 flex items-center gap-3"
        >

          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#C9151B] font-serif text-3xl font-bold italic text-white ph-brand-mark">
            P
          </span>

          <span className="font-serif text-3xl font-bold text-white">

            Pizza

            <span className="text-[#E51B23]">
              Hub.
            </span>

          </span>

        </Link>

        {/* MAIN CONFIRMATION CARD */}

        <motion.section
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45 }}
          className="relative w-full max-w-[540px] rounded-[28px] border border-[#351010] bg-[#141414] p-7 text-center shadow-2xl sm:p-10"
        >

          {/* ANIMATED SUCCESS ICON */}

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 15,
              delay: 0.15,
            }}
            className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-green-800 bg-[#10251A] shadow-[0_0_35px_rgba(34,197,94,0.12)]"
          >

            <CheckCircle2
              size={53}
              strokeWidth={1.6}
              className="text-green-400"
            />

          </motion.div>

          {/* CONFIRMATION HEADING */}

          <p className="mt-7 text-xs font-bold tracking-[0.22em] text-green-400">

            CHECKOUT COMPLETED

          </p>

          <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-white sm:text-5xl">

            Welcome to the
            <span className="block text-[#FF4545]">
              Next Level.
            </span>

          </h1>

          <p className="mx-auto mt-5 max-w-sm text-sm leading-7 text-white/75">

            Thank you for choosing PizzaHub Premium.
            Your subscription is subject to secure
            payment verification.

          </p>

          {/* PREMIUM PLAN BOX */}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-8 rounded-2xl border border-[#351010] bg-[#0B0B0B] p-6 text-left"
          >

            <div className="flex items-center gap-4">

              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#351010] bg-[#1C0808]">

                <Crown
                  size={29}
                  className="text-[#FF4545]"
                />

              </div>

              <div>

                <h2 className="text-xl font-bold text-white">

                  PizzaHub Premium

                </h2>

                <p className="mt-1 text-xs text-white/60">

                  Restaurant Subscription

                </p>

              </div>

            </div>

            <div className="my-6 border-t border-[#351010]" />

            <div className="space-y-4">

              {features.map((feature, index) => (

                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.3 + index * 0.07,
                  }}
                  className="flex items-center gap-3 text-sm text-white"
                >

                  <Check
                    size={18}
                    className="shrink-0 text-[#FF4545]"
                  />

                  {feature}

                </motion.div>

              ))}

            </div>

          </motion.div>

          {/* PAYMENT VERIFICATION NOTICE */}

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-green-900/70 bg-[#102019] p-4 text-left">

            <ShieldCheck
              size={22}
              className="shrink-0 text-green-400"
            />

            <div>

              <p className="text-sm font-semibold text-green-400">

                Secure Payment Verification

              </p>

              <p className="mt-2 text-xs leading-6 text-white/70">

                Your Premium plan will activate after
                the payment server verifies the transaction.
                Check your subscription page for the
                latest status.

              </p>

            </div>

          </div>

          {/* ACTION BUTTONS */}

          <div className="mt-7 space-y-3">

            <Link
              href="/dashboard/vendor/subscription"
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#C9151B] px-5 py-4 text-sm font-bold text-white transition duration-300 hover:bg-[#E51B23] hover:shadow-[0_8px_30px_rgba(229,27,35,0.2)]"
            >

              <Crown size={19} />

              View My Subscription

              <ArrowRight size={19} />

            </Link>

            <Link
              href="/dashboard/vendor"
              className="flex min-h-13 w-full items-center justify-center gap-3 rounded-xl border border-[#351010] bg-[#101010] px-5 py-3.5 text-sm font-semibold text-white transition hover:border-[#E51B23]"
            >

              <LayoutDashboard size={19} />

              Go to Vendor Dashboard

            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 pt-3 text-xs font-medium text-white/65 transition hover:text-[#FF4545]"
            >

              <Home size={15} />

              Return to Homepage

            </Link>

          </div>

        </motion.section>

        {/* SECURITY FOOTER */}

        <div className="relative mt-8 flex items-center gap-2 text-xs text-white/50">

          <Lock size={15} />

          Secure payments powered by

          <span className="text-sm font-bold text-white">
            stripe
          </span>

        </div>

      </main>

    </MotionConfig>

  );

}
