
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
  UserRound,
  Store,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  LoaderCircle,
  CheckCircle,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

type AccountRole = "customer" | "vendor";

export default function SignUpPage() {

  // =========================================
  // FORM STATES
  // =========================================

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [image, setImage] = useState("");

  const [role, setRole] =
    useState<AccountRole>("customer");

  const [businessName, setBusinessName] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [error, setError] = useState("");

  const busy = loading || googleLoading;

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    match:
      password.length > 0 &&
      password === confirmPassword,
  };

  const inputClass =
    "w-full min-w-0 border-0 bg-transparent py-4 text-sm text-white outline-none";

  const fieldClass =
    "flex items-center gap-3 rounded-xl border border-[#351010] bg-[#141414] px-4 transition focus-within:border-[#E51B23]";

  // =========================================
  // REGISTRATION
  // =========================================

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    if (busy) return;

    setError("");

    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (
      !passwordChecks.length ||
      !passwordChecks.uppercase ||
      !passwordChecks.lowercase
    ) {
      setError("Please follow the password requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (role === "vendor" && !businessName.trim()) {
      setError("Restaurant name is required.");
      return;
    }

    setLoading(true);

    try {

      const response = await fetch(
        `${API}/api/auth/sign-up/email`,
        {

          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({

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

          }),

        }
      );

      const result =
        await response.json().catch(() => null);

      if (!response.ok || result?.error) {
        throw new Error(
          result?.message ||
          result?.error?.message ||
          "Unable to create account."
        );
      }

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

      if (session?.user) {

        window.location.assign("/");

      } else {

        window.location.assign("/sign-in");

      }

    } catch (err) {

      const message =
        err instanceof Error
          ? err.message
          : "Registration failed.";

      setError(message);
      toast.error(message);

    } finally {

      setLoading(false);

    }
  }

  // =========================================
  // GOOGLE REGISTRATION
  // =========================================

  async function handleGoogleSignup() {

    if (busy || role !== "customer") return;

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
          result.message ||
          "Google registration failed."
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

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-5 py-20 text-white">

        {/* BACKGROUND */}

        <div className="pointer-events-none absolute -right-40 -top-40 h-[450px] w-[450px] rounded-full bg-[#E51B23]/10 blur-[140px]" />

        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[450px] w-[450px] rounded-full bg-[#E51B23]/10 blur-[140px]" />

        {/* BACK HOME */}

        <Link
          href="/"
          className="absolute left-6 top-6 z-10 flex items-center gap-2 text-sm font-semibold text-white transition hover:text-[#FF4545] sm:left-10"
        >

          <ArrowLeft size={19} />

          Back to Home

        </Link>

        {/* REGISTER CARD */}

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-[540px] rounded-3xl border border-[#351010] bg-[#101010] p-7 shadow-2xl sm:p-10"
        >

          {/* LOGO */}

          <div className="mb-8 text-center">

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

              Create Account

            </h1>

            <p className="mt-3 text-sm leading-6">

              Join PizzaHub and discover your favourite pizzas.

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

          <form
            onSubmit={handleRegister}
            className="space-y-5"
          >

            {/* ACCOUNT TYPE */}

            <fieldset>

              <legend className="mb-3 text-sm font-semibold">

                Choose Account Type

              </legend>

              <div className="grid grid-cols-2 gap-3">

                {[
                  {
                    value: "customer" as const,
                    title: "Customer",
                    description: "Order pizzas",
                    icon: UserRound,
                  },
                  {
                    value: "vendor" as const,
                    title: "Vendor",
                    description: "Sell pizzas",
                    icon: Store,
                  },
                ].map((account) => (

                  <motion.button
                    key={account.value}
                    type="button"
                    aria-pressed={role === account.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRole(account.value)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition ${
                      role === account.value
                        ? "border-[#E51B23] bg-[#1C0808]"
                        : "border-[#351010] bg-[#141414]"
                    }`}
                  >

                    <account.icon
                      size={27}
                      className="text-[#E51B23]"
                    />

                    <span className="font-bold">

                      {account.title}

                    </span>

                    <span className="text-xs">

                      {account.description}

                    </span>

                    {role === account.value && (

                      <CheckCircle
                        size={16}
                        className="absolute right-3 top-3 text-[#FF4545]"
                      />

                    )}

                  </motion.button>

                ))}

              </div>

            </fieldset>

            {/* FULL NAME */}

            <label className="block">

              <span className="mb-2 block text-sm font-semibold">

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

            {/* RESTAURANT NAME */}

            {role === "vendor" && (

              <motion.label
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="block"
              >

                <span className="mb-2 block text-sm font-semibold">

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

              </motion.label>

            )}

            {/* EMAIL */}

            <label className="block">

              <span className="mb-2 block text-sm font-semibold">

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

            {/* PROFILE IMAGE */}

            <label className="block">

              <span className="mb-2 block text-sm font-semibold">

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

            {/* PASSWORD */}

            <label className="block">

              <span className="mb-2 block text-sm font-semibold">

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
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  className={inputClass}
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="shrink-0 text-white hover:text-[#E51B23]"
                >

                  {showPassword
                    ? <EyeOff size={19} />
                    : <Eye size={19} />
                  }

                </button>

              </div>

            </label>

            {/* CONFIRM PASSWORD */}

            <label className="block">

              <span className="mb-2 block text-sm font-semibold">

                Confirm Password

              </span>

              <div className={fieldClass}>

                <Lock
                  size={19}
                  className="shrink-0 text-[#E51B23]"
                />

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Confirm password"
                  className={inputClass}
                />

                <button
                  type="button"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="shrink-0 text-white hover:text-[#E51B23]"
                >

                  {showConfirmPassword
                    ? <EyeOff size={19} />
                    : <Eye size={19} />
                  }

                </button>

              </div>

            </label>

            {/* PASSWORD VALIDATION */}

            <div className="space-y-2 rounded-xl border border-[#351010] bg-[#080808] p-4">

              {[
                {
                  valid: passwordChecks.length,
                  label: "Minimum 8 characters",
                },
                {
                  valid: passwordChecks.uppercase,
                  label: "One uppercase letter",
                },
                {
                  valid: passwordChecks.lowercase,
                  label: "One lowercase letter",
                },
                {
                  valid: passwordChecks.match,
                  label: "Passwords match",
                },
              ].map((check) => (

                <div
                  key={check.label}
                  className="flex items-center gap-2 text-xs"
                >

                  <CheckCircle
                    size={15}
                    className={
                      check.valid
                        ? "text-[#FF4545]"
                        : "text-white opacity-40"
                    }
                  />

                  <span>

                    {check.label}

                  </span>

                  <span className="ml-auto">
                    {check.valid ? "Met" : "Required"}
                  </span>

                </div>

              ))}

            </div>

            {/* REGISTER BUTTON */}

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

                  Creating Account...

                </>

              ) : (

                <>

                  Create Account

                  <ArrowRight size={19} />

                </>

              )}

            </motion.button>

          </form>

          {/* GOOGLE REGISTRATION */}

          {role === "customer" && (

            <>

              <div className="my-7 flex items-center gap-4">

                <div className="h-px flex-1 bg-[#351010]" />

                <span className="text-xs font-semibold">

                  OR

                </span>

                <div className="h-px flex-1 bg-[#351010]" />

              </div>

              <button
                type="button"
                disabled={busy}
                onClick={handleGoogleSignup}
                className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-[#351010] bg-[#141414] px-4 font-semibold text-white transition hover:border-[#E51B23] disabled:opacity-50"
              >

                {googleLoading ? (

                  <LoaderCircle
                    size={20}
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

            </>

          )}

          {/* LOGIN LINK */}

          <p className="mt-8 text-center text-sm">

            Already have an account?

            {" "}

            <Link
              href="/sign-in"
              className="font-bold text-[#FF4545] hover:underline"
            >

              Sign In

            </Link>

          </p>

        </motion.div>

      </main>

    </MotionConfig>

  );
}
