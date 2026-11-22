
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  LoaderCircle,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const dashboards: Record<string, string> = {
  customer: "/dashboard/customer",
  vendor: "/dashboard/vendor",
  admin: "/dashboard/admin",
};

export default function DashboardRedirect() {
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function redirect() {
      try {
        setError("");

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
          throw new Error("Unable to verify your account.");
        }

        const session = await response.json();

        if (controller.signal.aborted) return;

        if (!session?.user) {
          window.location.replace("/sign-in");
          return;
        }

        if (session.user.isBlocked) {
          throw new Error(
            "Your account has been blocked."
          );
        }

        const role = session.user.role;

        if (!Object.hasOwn(dashboards, role)) {
          throw new Error("Invalid account role.");
        }

        window.location.replace(
          dashboards[role]
        );

      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to open dashboard."
          );
        }
      }
    }

    redirect();

    return () => controller.abort();
  }, [retry]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white">

      <div className="w-full max-w-md rounded-3xl border border-[#351010] bg-[#141414] p-9 text-center">

        <div className="mb-8 font-serif text-4xl font-bold">
          Pizza<span className="text-[#E51B23]">Hub.</span>
        </div>

        {error ? (
          <>
            <ShieldCheck
              size={55}
              className="mx-auto text-[#E51B23]"
            />

            <h1 className="mt-6 text-2xl font-bold">
              Dashboard Unavailable
            </h1>

            <p className="mt-4 text-sm text-white/70">
              {error}
            </p>

            <button
              onClick={() => setRetry(value => value + 1)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C9151B] px-5 py-4 font-bold"
            >
              <RefreshCw size={18} />
              Try Again
            </button>

            <Link
              href="/"
              className="mt-5 inline-block text-sm text-white/70"
            >
              Back to Home
            </Link>
          </>
        ) : (
          <>
            <LoaderCircle
              size={45}
              className="mx-auto animate-spin text-[#E51B23]"
            />

            <h1 className="mt-6 text-2xl font-bold">
              Opening Dashboard
            </h1>

            <p className="mt-3 text-sm text-white/60">
              Verifying your account permissions...
            </p>
          </>
        )}

      </div>

    </main>
  );
}
