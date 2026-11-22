
"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

import {
  motion,
  MotionConfig,
} from "motion/react";

import { toast } from "sonner";

import {
  UserRound,
  Mail,
  Camera,
  Store,
  ShieldCheck,
  Crown,
  ArrowLeft,
  Save,
  LoaderCircle,
  Lock,
  Upload,
  X,
  LayoutDashboard,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  businessName?: string;
  isBlocked?: boolean;
  subscriptionPlan?: string;
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
    throw new Error("Unable to load your profile.");
  }

  const result = await response.json();

  return result?.user ?? null;
}

async function getToken() {

  const response = await fetch(
    `${API}/api/auth/token`,
    {
      credentials: "include",
      cache: "no-store",
    }
  );

  const result = await response.json()
    .catch(() => null);

  if (!response.ok || !result?.token) {
    throw new Error("Authentication failed.");
  }

  return result.token as string;
}

export default function ProfilePage() {
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

  const [name, setName] =
    useState("");

  const [businessName, setBusinessName] =
    useState("");

  const [image, setImage] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState("");

  const [imageFailed, setImageFailed] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [retry, setRetry] =
    useState(0);

  const fileInput =
    useRef<HTMLInputElement>(null);

  const saveLock = useRef(false);

  const inputClass =
    "w-full rounded-xl border border-[#351010] bg-[#080808] px-4 py-4 text-sm text-white outline-none transition focus:border-[#E51B23]";

  // =====================================
  // LOAD PROFILE
  // =====================================

  useEffect(() => {

    const controller = new AbortController();

    async function initialize() {

      try {

        setLoading(true);
        setError("");

        const currentUser =
          await getSession(controller.signal);

        if (controller.signal.aborted) return;

        if (!currentUser) {

          window.location.replace("/sign-in");

          return;

        }

        if (
          currentUser.isBlocked ||
          !["customer", "vendor"].includes(
            currentUser.role
          )
        ) {

          throw new Error(
            "You cannot access this profile page."
          );

        }

        setUser(currentUser);
        setName(currentUser.name || "");

        setBusinessName(
          currentUser.businessName || ""
        );

      } catch (err) {

        if (!controller.signal.aborted) {

          setError(
            err instanceof Error
              ? err.message
              : "Profile unavailable."
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

  }, [retry]);

  // =====================================
  // IMAGE PREVIEW
  // =====================================

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // =====================================
  // SELECT PROFILE IMAGE
  // =====================================

  function chooseImage(file?: File) {

    if (!file || saving) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.type)) {

      toast.error(
        "Only JPEG, PNG and WebP images are allowed."
      );

      if (fileInput.current) {
        fileInput.current.value = "";
      }

      return;

    }

    if (file.size > 5 * 1024 * 1024) {

      toast.error(
        "Image size cannot exceed 5 MB."
      );

      if (fileInput.current) {
        fileInput.current.value = "";
      }

      return;

    }

    setError("");
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setImageFailed(false);

  }

  function removeSelectedImage() {

    if (saving) return;

    setImage(null);
    setPreview("");
    setImageFailed(false);

    if (fileInput.current) {
      fileInput.current.value = "";
    }

  }

  function resetForm() {

    if (!user || saving) return;

    setName(user.name || "");

    setBusinessName(
      user.businessName || ""
    );

    removeSelectedImage();
    setError("");

  }

  // =====================================
  // UPDATE PROFILE
  // =====================================

  async function saveProfile(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    if (!user || saveLock.current) return;

    setError("");

    if (!name.trim()) {

      setError("Name is required.");

      return;

    }

    const formData = new FormData();

    if (name.trim() !== user.name) {

      formData.append(
        "name",
        name.trim()
      );

    }

    if (
      user.role === "vendor" &&
      businessName.trim() !==
        (user.businessName || "")
    ) {

      if (!businessName.trim()) {

        setError("Business name is required.");

        return;

      }

      formData.append(
        "businessName",
        businessName.trim()
      );

    }

    if (image) {
      formData.append("image", image);
    }

    if (
      !formData.has("name") &&
      !formData.has("businessName") &&
      !formData.has("image")
    ) {

      toast.info("No changes to save.");

      return;

    }

    try {

      saveLock.current = true;
      setSaving(true);

      const token = await getToken();

      const response = await fetch(
        `${API}/api/profile`,
        {
          method: "PATCH",

          credentials: "include",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: formData,
        }
      );

      const result = await response.json()
        .catch(() => null);

      if (!response.ok || result?.success === false) {

        throw new Error(
          result?.message ||
          "Unable to update profile."
        );

      }

      toast.success(
        "Profile updated successfully."
      );

      // Fetch the latest profile from the server.

      try {

        const updatedUser = await getSession();

        if (
          !updatedUser ||
          updatedUser.id !== user.id ||
          updatedUser.isBlocked
        ) {

          window.location.replace("/dashboard");

          return;

        }

        setUser(updatedUser);

        setName(updatedUser.name || "");

        setBusinessName(
          updatedUser.businessName || ""
        );

        setImage(null);
        setImageFailed(false);

        if (fileInput.current) {
          fileInput.current.value = "";
        }

      } catch {

        setError(
          "Profile saved. Reload this page to view your latest information."
        );

      }

    } catch (err) {

      const message =
        err instanceof Error
          ? err.message
          : "Profile update failed.";

      setError(message);
      toast.error(message);

    } finally {

      saveLock.current = false;
      setSaving(false);

    }

  }

  // =====================================
  // LOADING
  // =====================================

  if (loading) {

    return (

      <main className="grid min-h-screen place-items-center bg-[#080808] text-white">

        <div className="text-center">

          <LoaderCircle
            size={42}
            className="mx-auto animate-spin text-[#E51B23]"
          />

          <p className="mt-5 text-sm">
            Loading your profile...
          </p>

        </div>

      </main>

    );

  }

  // =====================================
  // ACCESS CONTROL
  // =====================================

  if (!user) {

    return (

      <main className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white">

        <div className="w-full max-w-md rounded-3xl border border-[#351010] bg-[#141414] p-8 text-center">

          <ShieldCheck
            size={60}
            className="mx-auto text-[#E51B23]"
          />

          <h1 className="mt-5 text-3xl font-bold">
            Profile Unavailable
          </h1>

          <p className="mt-4 text-sm text-white/70">
            {error || "Please sign in."}
          </p>

          <button
            onClick={() =>
              setRetry(value => value + 1)
            }
            className="mt-6 rounded-xl bg-[#C9151B] px-6 py-3 font-bold"
          >
            Try Again
          </button>

          <Link
            href="/"
            className="mt-5 block text-sm text-white/70"
          >
            Return to Homepage
          </Link>

        </div>

      </main>

    );

  }

  const isVendor =
    user.role === "vendor";

  const isPremium =
    isVendor &&
    user.subscriptionPlan === "premium" &&
    !!user.subscriptionExpiresAt &&
    new Date(
      user.subscriptionExpiresAt
    ).getTime() > clockNow;

  const imageSource =
    preview || user.image || "";

  const hasChanges =
    name.trim() !== user.name ||
    (
      isVendor &&
      businessName.trim() !==
        (user.businessName || "")
    ) ||
    !!image;

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
              href="/dashboard"
              className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF4545]"
            >

              <ArrowLeft size={18} />

              Dashboard

            </Link>

          </nav>

        </header>

        <main className="mx-auto max-w-6xl px-5 py-12">

          {/* PAGE HEADING */}

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >

            <p className="text-xs font-bold tracking-widest text-[#FF4545]">

              ACCOUNT MANAGEMENT

            </p>

            <h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">

              Profile Settings

            </h1>

            <p className="mt-4 text-sm text-white/70">

              Personalize your PizzaHub account.

            </p>

          </motion.div>

          <div className="mt-9 grid items-start gap-6 lg:grid-cols-[340px_1fr]">

            {/* PROFILE CARD */}

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-[#351010] bg-[#141414] p-7 text-center"
            >

              <div className="relative mx-auto h-36 w-36">

                <div className="grid h-full w-full place-items-center overflow-hidden rounded-full border-[3px] border-[#E51B23] bg-[#280808]">

                  {imageSource && !imageFailed ? (

                    <img
                      src={imageSource}
                      alt="Profile picture"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setImageFailed(true)
                      }
                      className="h-full w-full object-cover"
                    />

                  ) : (

                    <UserRound
                      size={70}
                      strokeWidth={1.4}
                      className="text-[#FF4545]"
                    />

                  )}

                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    fileInput.current?.click()
                  }
                  aria-label="Change profile picture"
                  className="absolute bottom-1 right-1 grid h-11 w-11 place-items-center rounded-full border-4 border-[#141414] bg-[#C9151B]"
                >

                  <Camera size={19} />

                </button>

              </div>

              <input
                type="file"
                ref={fileInput}
                accept="image/jpeg,image/png,image/webp"
                disabled={saving}
                className="hidden"
                onChange={event =>
                  chooseImage(
                    event.target.files?.[0]
                  )
                }
              />

              <h2 className="mt-6 break-words text-2xl font-bold">

                {user.name}

              </h2>

              <p className="mt-2 break-all text-sm text-white/60">

                {user.email}

              </p>

              <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-[#FF4545]">

                {isVendor ? (

                  <Store size={18} />

                ) : (

                  <UserRound size={18} />

                )}

                {isVendor
                  ? "Restaurant Vendor"
                  : "Customer"}

              </div>

              {isPremium && (

                <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border border-amber-700/50 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-400">

                  <Crown size={16} />

                  Premium Vendor

                </div>

              )}

              <div className="my-6 border-t border-[#351010]" />

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  fileInput.current?.click()
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#351010] bg-[#080808] px-4 py-3.5 text-sm font-semibold transition hover:border-[#E51B23]"
              >

                <Upload size={18} />

                Change Profile Picture

              </button>

              {image && (

                <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#351010] bg-[#101010] p-3">

                  <span className="flex-1 truncate text-left text-xs text-white/80">

                    {image.name}

                  </span>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={removeSelectedImage}
                    aria-label="Remove selected image"
                    className="text-[#FF4545]"
                  >

                    <X size={18} />

                  </button>

                </div>

              )}

              <p className="mt-4 text-xs leading-6 text-white/50">

                JPEG, PNG or WebP. Maximum 5 MB.

              </p>

              {image && (

                <p className="mt-2 text-xs text-[#FF4545]">

                  Save changes to upload your new picture.

                </p>

              )}

            </motion.section>

            {/* EDIT PROFILE FORM */}

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-3xl border border-[#351010] bg-[#141414] p-6 sm:p-8"
            >

              <h2 className="text-2xl font-bold">
                Personal Information
              </h2>

              <p className="mt-3 text-sm text-white/65">

                Update your profile details.

              </p>

              {error && (

                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-[#E51B23] bg-[#1C0808] p-4 text-sm text-[#FF7777]"
                >

                  {error}

                </div>

              )}

              <form
                onSubmit={saveProfile}
                className="mt-7 space-y-6"
              >

                {/* NAME */}

                <label className="block">

                  <span className="mb-3 flex items-center gap-2 text-sm font-semibold">

                    <UserRound
                      size={18}
                      className="text-[#FF4545]"
                    />

                    Full Name

                  </span>

                  <input
                    required
                    disabled={saving}
                    value={name}
                    onChange={event =>
                      setName(event.target.value)
                    }
                    className={inputClass}
                    placeholder="Enter your name"
                  />

                </label>

                {/* EMAIL */}

                <label className="block">

                  <span className="mb-3 flex items-center gap-2 text-sm font-semibold">

                    <Mail
                      size={18}
                      className="text-[#FF4545]"
                    />

                    Email Address

                    <Lock
                      size={14}
                      className="ml-auto text-white/40"
                    />

                  </span>

                  <input
                    type="email"
                    readOnly
                    value={user.email}
                    className={`${inputClass} cursor-not-allowed opacity-60`}
                  />

                </label>

                {/* BUSINESS NAME */}

                {isVendor && (

                  <label className="block">

                    <span className="mb-3 flex items-center gap-2 text-sm font-semibold">

                      <Store
                        size={18}
                        className="text-[#FF4545]"
                      />

                      Restaurant Name

                    </span>

                    <input
                      disabled={saving}
                      value={businessName}
                      onChange={event =>
                        setBusinessName(
                          event.target.value
                        )
                      }
                      placeholder="Restaurant name"
                      className={inputClass}
                    />

                  </label>

                )}

                {/* ACCOUNT ROLE */}

                <label className="block">

                  <span className="mb-3 flex items-center gap-2 text-sm font-semibold">

                    <ShieldCheck
                      size={18}
                      className="text-[#FF4545]"
                    />

                    Account Role

                    <Lock
                      size={14}
                      className="ml-auto text-white/40"
                    />

                  </span>

                  <input
                    readOnly
                    value={
                      isVendor
                        ? "Vendor"
                        : "Customer"
                    }
                    className={`${inputClass} cursor-not-allowed opacity-60`}
                  />

                </label>

                {/* SUBSCRIPTION */}

                {isVendor && (

                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#351010] bg-[#080808] p-5">

                    <div className="flex items-center gap-3">

                      <Crown
                        size={27}
                        className="text-[#FF4545]"
                      />

                      <div>

                        <p className="text-xs text-white/60">
                          Subscription
                        </p>

                        <p className="mt-1 font-bold">

                          {isPremium
                            ? "Premium Plan"
                            : "Free Plan"}

                        </p>

                      </div>

                    </div>

                    <Link
                      href="/dashboard/vendor/subscription"
                      className="rounded-lg bg-[#C9151B] px-4 py-3 text-xs font-bold"
                    >

                      Manage Plan

                    </Link>

                  </div>

                )}

                {/* ACTIONS */}

                <div className="grid gap-3 border-t border-[#351010] pt-6 sm:grid-cols-[1fr_auto]">

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.98 }}
                    disabled={saving || !hasChanges}
                    className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#C9151B] px-6 py-4 text-sm font-bold transition hover:bg-[#E51B23] disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    {saving ? (

                      <>

                        <LoaderCircle
                          size={20}
                          className="animate-spin"
                        />

                        Saving Changes...

                      </>

                    ) : (

                      <>

                        <Save size={19} />

                        Save Changes

                      </>

                    )}

                  </motion.button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={resetForm}
                    className="rounded-xl border border-[#351010] bg-[#080808] px-7 py-4 text-sm font-semibold"
                  >

                    Reset

                  </button>

                </div>

              </form>

              {/* SECURITY MESSAGE */}

              <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#101010] p-4">

                <Lock
                  size={18}
                  className="shrink-0 text-[#FF4545]"
                />

                <p className="text-xs leading-6 text-white/65">

                  Your email, account role and subscription
                  status cannot be changed through profile
                  settings.

                </p>

              </div>

            </motion.section>

          </div>

          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#FF4545]"
          >

            <LayoutDashboard size={18} />

            Return to Dashboard

          </Link>

        </main>

        <footer className="mt-10 border-t border-[#351010] px-5 py-8 text-center text-xs text-white/50">

          PizzaHub Account Management

        </footer>

      </div>

    </MotionConfig>

  );

}
