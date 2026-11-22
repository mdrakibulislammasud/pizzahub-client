
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  motion,
  MotionConfig,
} from "motion/react";

import {
  XCircle,
  ShieldCheck,
  RefreshCw,
  LayoutDashboard,
  ArrowRight,
  Home,
  Lock,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

export default function PaymentCancelPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");

  // VERIFY VENDOR ACCOUNT

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
          window.location.replace("/sign-in");
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
          window.location.replace("/sign-in");
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
            size={45}
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

          <p className="mt-4 text-sm text-white/70">
            {error || "Please sign in again."}
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex rounded-xl bg-[#C9151B] px-7 py-4 font-bold text-white"
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

        {/* MAIN CARD */}

        <motion.section
          initial={{
            opacity: 0,
            y: 25,
            scale: 0.97,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-[520px] rounded-[28px] border border-[#351010] bg-[#141414] p-7 text-center shadow-2xl sm:p-10"
        >

          {/* ANIMATED ICON */}

          <motion.div
            initial={{
              scale: 0,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 15,
              delay: 0.1,
            }}
            className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-[#E51B23]/40 bg-[#280808] shadow-[0_0_35px_rgba(229,27,35,0.12)]"
          >

            <XCircle
              size={53}
              strokeWidth={1.6}
              className="text-[#FF4545]"
            />

          </motion.div>

          <p className="mt-7 text-xs font-bold tracking-[0.22em] text-[#FF4545]">
            CHECKOUT INTERRUPTED
          </p>

          <h1 className="mt-4 font-serif text-4xl font-bold text-white sm:text-5xl">
            Checkout
            <span className="block text-[#FF4545]">
              Cancelled.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-sm text-sm leading-7 text-white/75">

            You have returned from Stripe Checkout.
            You can review your subscription status
            and continue whenever you are ready.

          </p>

          {/* SECURITY INFORMATION */}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 rounded-2xl border border-[#351010] bg-[#080808] p-5 text-left"
          >

            <div className="flex items-start gap-3">

              <ShieldCheck
                size={27}
                className="shrink-0 text-green-400"
              />

              <div>

                <h2 className="font-bold text-white">
                  Your account is secure
                </h2>

                <p className="mt-3 text-xs leading-6 text-white/70">

                  Returning from checkout does not
                  change your subscription. Payment
                  and activation status are verified
                  securely by our server.

                </p>

              </div>

            </div>

          </motion.div>

          {/* ACTION BUTTONS */}

          <div className="mt-8 space-y-3">

            <Link
              href="/dashboard/vendor/subscription"
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#C9151B] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#E51B23]"
            >

              <RefreshCw size={19} />

              Return to Subscription

              <ArrowRight size={18} />

            </Link>

            <Link
              href="/dashboard/vendor"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#351010] bg-[#101010] px-5 py-4 text-sm font-semibold text-white hover:border-[#E51B23]"
            >

              <LayoutDashboard size={19} />

              Go to Vendor Dashboard

            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-2 pt-3 text-xs text-white/60 hover:text-[#FF4545]"
            >

              <Home size={15} />

              Return to Homepage

            </Link>

          </div>

        </motion.section>

        <div className="relative mt-8 flex items-center gap-2 text-xs text-white/50">

          <Lock size={15} />

          Secure payments powered by

          <span className="font-bold text-white">
            stripe
          </span>

        </div>

      </main>

    </MotionConfig>
  );
}
