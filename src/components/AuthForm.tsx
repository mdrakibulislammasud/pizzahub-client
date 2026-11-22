
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserRound,
  Store,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  LoaderCircle,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

interface Props {
  mode: "sign-in" | "sign-up";
}

export default function AuthForm({ mode }: Props) {
  const isSignup = mode === "sign-up";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState("");

  const [role, setRole] =
    useState<"customer" | "vendor">("customer");

  const [businessName, setBusinessName] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState("");

  const busy = loading || googleLoading;

  const inputClass =
    "min-w-0 w-full bg-transparent py-3.5 text-sm text-white outline-none border-0";

  const fieldClass =
    "flex items-center gap-3 rounded-xl border border-[#351010] bg-[#141414] px-4 transition focus-within:border-[#E51B23]";

  // =====================================
  // EMAIL AUTHENTICATION
  // =====================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) return;

    setError("");

    if (isSignup) {
      if (!name.trim()) {
        setError("Full name is required.");
        return;
      }

      if (
        password.length < 6 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password)
      ) {
        setError(
          "Password must contain at least 6 characters, one uppercase and one lowercase letter."
        );

        return;
      }

      if (role === "vendor" && !businessName.trim()) {
        setError("Restaurant name is required.");
        return;
      }
    }

    try {
      setLoading(true);

      const endpoint = isSignup
        ? "/api/auth/sign-up/email"
        : "/api/auth/sign-in/email";

      const body = isSignup
        ? {
            name: name.trim(),
            email: email.trim(),
            password,
            role,
            ...(image.trim()
              ? { image: image.trim() }
              : {}),
            ...(role === "vendor"
              ? { businessName: businessName.trim() }
              : {}),
          }
        : {
            email: email.trim(),
            password,
          };

      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.error) {
        throw new Error(
          result?.message ||
          result?.error?.message ||
          (isSignup
            ? "Unable to create your account."
            : "Invalid email or password.")
        );
      }

      if (isSignup) {
        toast.success("Account created successfully!");

        const sessionResponse = await fetch(
          `${API}/api/auth/get-session`,
          {
            credentials: "include",
            cache: "no-store",
          }
        ).catch(() => null);

        const session = sessionResponse?.ok
          ? await sessionResponse.json().catch(() => null)
          : null;

        window.location.assign(
          session?.user ? "/" : "/sign-in"
        );

        return;
      }

      toast.success("Signed in successfully!");

      window.location.assign("/");

    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Authentication failed.";

      setError(message);
      toast.error(message);

    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // GOOGLE AUTHENTICATION
  // =====================================

  async function handleGoogle() {
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
            callbackURL: window.location.origin,
            disableRedirect: true,
          }),
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.url) {
        throw new Error(
          result?.message || "Google sign-in failed."
        );
      }

      const redirectURL = new URL(result.url);

      if (!["https:", "http:"].includes(redirectURL.protocol)) {
        throw new Error("Invalid authentication URL.");
      }

      window.location.assign(redirectURL.href);

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

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-5 py-16 text-white">

      {/* BACKGROUND */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#E51B23]/10 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[#E51B23]/10 blur-[120px]"
      />

      {/* BACK HOME */}

      <Link
        href="/"
        className="absolute left-5 top-6 flex items-center gap-2 text-sm font-medium text-white transition hover:text-[#FF4545] sm:left-10"
      >
        <ArrowLeft size={18} />
        Back to Home
      </Link>

      {/* AUTH CARD */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-[470px] rounded-3xl border border-[#351010] bg-[#101010] p-6 shadow-2xl sm:p-9"
      >

        {/* BRAND */}

        <div className="mb-8 text-center">

          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-3"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#C9151B] font-serif text-4xl font-bold italic text-white">
              P
            </span>

            <span className="font-serif text-3xl font-bold text-white">
              Pizza
              <span className="text-[#E51B23]">Hub.</span>
            </span>
          </Link>

          <h1 className="font-serif text-4xl font-bold text-white">
            {isSignup ? "Create Account" : "Welcome Back"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-white">
            {isSignup
              ? "Join PizzaHub and discover your favourite pizzas."
              : "Sign in to your PizzaHub account."}
          </p>

        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-[#E51B23] bg-[#1C0808] p-4 text-sm text-[#FF7777]"
          >
            {error}
          </div>
        )}

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* FULL NAME */}

          {isSignup && (
            <label className="block">

              <span className="mb-2 block text-sm font-medium">
                Full Name
              </span>

              <div className={fieldClass}>
                <UserRound
                  size={19}
                  className="shrink-0 text-[#E51B23]"
                />

                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className={inputClass}
                />
              </div>

            </label>
          )}

          {/* EMAIL */}

          <label className="block">

            <span className="mb-2 block text-sm font-medium">
              Email Address
            </span>

            <div className={fieldClass}>
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
                className={inputClass}
              />
            </div>

          </label>

          {/* PASSWORD */}

          <label className="block">

            <span className="mb-2 block text-sm font-medium">
              Password
            </span>

            <div className={fieldClass}>

              <Lock
                size={19}
                className="shrink-0 text-[#E51B23]"
              />

              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={isSignup ? 6 : undefined}
                autoComplete={
                  isSignup
                    ? "new-password"
                    : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={inputClass}
              />

              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                className="shrink-0 text-white hover:text-[#E51B23]"
              >
                {showPassword
                  ? <EyeOff size={19} />
                  : <Eye size={19} />}
              </button>

            </div>

            {isSignup && (
              <p className="mt-2 text-xs leading-5 text-white">
                Minimum 6 characters, uppercase and lowercase.
              </p>
            )}

          </label>

          {/* PROFILE IMAGE */}

          {isSignup && (
            <label className="block">

              <span className="mb-2 block text-sm font-medium">
                Profile Image URL (Optional)
              </span>

              <div className={fieldClass}>

                <ImageIcon
                  size={19}
                  className="shrink-0 text-[#E51B23]"
                />

                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className={inputClass}
                />

              </div>

            </label>
          )}

          {/* ROLE SELECTION */}

          {isSignup && (
            <fieldset>

              <legend className="mb-3 text-sm font-medium">
                Account Type
              </legend>

              <div className="grid grid-cols-2 gap-3">

                {[
                  {
                    value: "customer" as const,
                    label: "Customer",
                    icon: UserRound,
                  },
                  {
                    value: "vendor" as const,
                    label: "Vendor",
                    icon: Store,
                  },
                ].map((option) => (

                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={role === option.value}
                    onClick={() => setRole(option.value)}
                    className={`flex flex-col items-center gap-3 rounded-xl border p-4 text-sm font-semibold transition ${
                      role === option.value
                        ? "border-[#E51B23] bg-[#1C0808] text-[#FF4545]"
                        : "border-[#351010] bg-[#141414] text-white"
                    }`}
                  >

                    <option.icon size={26} />
                    {option.label}

                  </button>

                ))}

              </div>

            </fieldset>
          )}

          {/* RESTAURANT NAME */}

          {isSignup && role === "vendor" && (
            <label className="block">

              <span className="mb-2 block text-sm font-medium">
                Restaurant Name
              </span>

              <div className={fieldClass}>

                <Store
                  size={19}
                  className="shrink-0 text-[#E51B23]"
                />

                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) =>
                    setBusinessName(e.target.value)
                  }
                  placeholder="Enter restaurant name"
                  className={inputClass}
                />

              </div>

            </label>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={busy}
            className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#C9151B] font-bold text-white transition hover:bg-[#E51B23] disabled:opacity-50"
          >

            {loading ? (
              <>
                <LoaderCircle
                  size={20}
                  className="animate-spin"
                />

                {isSignup
                  ? "Creating Account..."
                  : "Signing In..."}
              </>
            ) : (
              <>
                {isSignup ? "Create Account" : "Sign In"}
                <ArrowRight size={19} />
              </>
            )}

          </button>

        </form>

        {/* GOOGLE SIGN IN */}

        {(!isSignup || role === "customer") && (
          <>
            <div className="my-6 flex items-center gap-4">

              <div className="h-px flex-1 bg-[#351010]" />

              <span className="text-xs text-white">
                OR
              </span>

              <div className="h-px flex-1 bg-[#351010]" />

            </div>

            <button
              type="button"
              disabled={busy}
              onClick={handleGoogle}
              className="flex min-h-13 w-full items-center justify-center gap-3 rounded-xl border border-[#351010] bg-[#141414] px-4 py-3.5 text-sm font-semibold text-white transition hover:border-[#E51B23] disabled:opacity-50"
            >

              {googleLoading ? (
                <LoaderCircle
                  size={20}
                  className="animate-spin"
                />
              ) : (
                <span className="text-xl font-bold text-white">
                  G
                </span>
              )}

              {googleLoading
                ? "Connecting..."
                : "Continue with Google"}

            </button>

          </>
        )}

        {/* SWITCH AUTH PAGE */}

        <p className="mt-7 text-center text-sm text-white">

          {isSignup
            ? "Already have an account?"
            : "Don't have an account?"}

          {" "}

          <Link
            href={isSignup ? "/sign-in" : "/sign-up"}
            className="font-bold text-[#FF4545] hover:underline"
          >
            {isSignup ? "Sign In" : "Sign Up"}
          </Link>

        </p>

      </motion.div>

    </main>
  );
}
