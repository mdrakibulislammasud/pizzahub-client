
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import { toast } from "sonner";

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  LoaderCircle,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

export default function SignInPage() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState("");

  const busy = loading || googleLoading;

  // =========================================
  // EMAIL LOGIN
  // =========================================

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) return;

    setLoading(true);
    setError("");

    try {

      const response = await fetch(
        `${API}/api/auth/sign-in/email`,
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.error) {
        throw new Error(
          result?.message ||
          result?.error?.message ||
          "Invalid email or password."
        );
      }

      const sessionResponse = await fetch(
        `${API}/api/auth/get-session`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const session = await sessionResponse.json();

      if (!sessionResponse.ok || !session?.user) {
        throw new Error("Unable to verify your session.");
      }

      if (session.user.isBlocked) {

        await fetch(`${API}/api/auth/sign-out`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: "{}",
        });

        throw new Error("Your account has been blocked.");
      }

      toast.success("Signed in successfully!");

      window.location.assign("/");

    } catch (err) {

      const message =
        err instanceof Error
          ? err.message
          : "Unable to sign in.";

      setError(message);
      toast.error(message);

    } finally {

      setLoading(false);

    }
  }

  // =========================================
  // GOOGLE LOGIN
  // =========================================

  async function handleGoogleLogin() {

    if (busy) return;

    setGoogleLoading(true);
    setError("");

    try {

      const response = await fetch(
        `${API}/api/auth/sign-in/social`,
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            provider: "google",
            callbackURL: window.location.origin + "/",
            disableRedirect: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.url) {
        throw new Error(
          result.message || "Google login failed."
        );
      }

      const redirect = new URL(result.url);

      if (!["https:", "http:"].includes(redirect.protocol)) {
        throw new Error("Invalid authentication URL.");
      }

      window.location.assign(redirect.href);

    } catch (err) {

      const message =
        err instanceof Error
          ? err.message
          : "Unable to connect with Google.";

      setError(message);
      toast.error(message);

      setGoogleLoading(false);
    }
  }

  // =========================================
  // USER INTERFACE
  // =========================================

  return (

    <MotionConfig reducedMotion="user">

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-5 py-16 text-white">

        {/* BACKGROUND LIGHTING */}

        <div className="pointer-events-none absolute -right-40 -top-40 h-[450px] w-[450px] rounded-full bg-[#E51B23]/10 blur-[140px]" />

        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[450px] w-[450px] rounded-full bg-[#E51B23]/10 blur-[140px]" />

        {/* BACK BUTTON */}

        <Link
          href="/"
          className="absolute left-6 top-6 z-10 flex items-center gap-2 text-sm font-semibold text-white transition hover:text-[#FF4545] sm:left-10"
        >
          <ArrowLeft size={19} />
          Back to Home
        </Link>

        {/* LOGIN CARD */}

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-[460px] rounded-3xl border border-[#351010] bg-[#101010] p-7 shadow-2xl sm:p-10"
        >

          {/* LOGO */}

          <div className="mb-9 text-center">

            <Link
              href="/"
              className="mb-7 inline-flex items-center gap-3"
            >

              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#C9151B] font-serif text-4xl font-bold italic text-white ph-brand-mark">
                P
              </span>

              <span className="font-serif text-3xl font-bold text-white">
                Pizza
                <span className="text-[#E51B23]">
                  Hub.
                </span>
              </span>

            </Link>

            <h1 className="font-serif text-4xl font-bold">
              Welcome Back
            </h1>

            <p className="mt-3 text-sm leading-6">
              Sign in to continue your PizzaHub experience.
            </p>

          </div>

          {/* ERROR MESSAGE */}

          {error && (

            <div
              role="alert"
              className="mb-5 rounded-xl border border-[#E51B23] bg-[#1C0808] p-4 text-sm text-[#FF7777]"
            >
              {error}
            </div>

          )}

          {/* LOGIN FORM */}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* EMAIL */}

            <label className="block">

              <span className="mb-2 block text-sm font-semibold">
                Email Address
              </span>

              <div className="flex items-center gap-3 rounded-xl border border-[#351010] bg-[#141414] px-4 transition focus-within:border-[#E51B23]">

                <Mail
                  size={19}
                  className="shrink-0 text-[#E51B23]"
                />

                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full min-w-0 border-0 bg-transparent py-4 text-sm text-white outline-none"
                />

              </div>

            </label>

            {/* PASSWORD */}

            <label className="block">

              <span className="mb-2 block text-sm font-semibold">
                Password
              </span>

              <div className="flex items-center gap-3 rounded-xl border border-[#351010] bg-[#141414] px-4 transition focus-within:border-[#E51B23]">

                <Lock
                  size={19}
                  className="shrink-0 text-[#E51B23]"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full min-w-0 border-0 bg-transparent py-4 text-sm text-white outline-none"
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="shrink-0 text-white transition hover:text-[#E51B23]"
                >

                  {showPassword
                    ? <EyeOff size={19} />
                    : <Eye size={19} />
                  }

                </button>

              </div>

            </label>

            {/* LOGIN BUTTON */}

            <motion.button
              type="submit"
              disabled={busy}
              whileTap={{ scale: 0.98 }}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#C9151B] font-bold text-white transition hover:bg-[#E51B23] disabled:opacity-50"
            >

              {loading ? (

                <>
                  <LoaderCircle
                    size={20}
                    className="animate-spin"
                  />
                  Signing In...
                </>

              ) : (

                <>
                  Sign In
                  <ArrowRight size={19} />
                </>

              )}

            </motion.button>

          </form>

          {/* DIVIDER */}

          <div className="my-7 flex items-center gap-4">

            <div className="h-px flex-1 bg-[#351010]" />

            <span className="text-xs font-semibold">
              OR
            </span>

            <div className="h-px flex-1 bg-[#351010]" />

          </div>

          {/* GOOGLE LOGIN */}

          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleLogin}
            className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-[#351010] bg-[#141414] px-4 font-semibold text-white transition hover:border-[#E51B23] disabled:opacity-50"
          >

            {googleLoading ? (

              <LoaderCircle
                size={21}
                className="animate-spin"
              />

            ) : (

              <span className="text-2xl font-bold">
                G
              </span>

            )}

            {googleLoading
              ? "Connecting..."
              : "Continue with Google"
            }

          </button>

          {/* SIGN UP LINK */}

          <p className="mt-8 text-center text-sm">

            Don&apos;t have an account?

            {" "}

            <Link
              href="/sign-up"
              className="font-bold text-[#FF4545] hover:underline"
            >
              Create Account
            </Link>

          </p>

        </motion.div>

      </main>

    </MotionConfig>

  );
}
