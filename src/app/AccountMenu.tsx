
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  ChevronDown,
  UserRound,
  LayoutDashboard,
  Settings,
  LogOut,
  ShieldCheck,
  Crown,
  Store,
  LoaderCircle,
} from "lucide-react";

import {
  motion,
  AnimatePresence,
} from "motion/react";

interface AccountUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  isBlocked?: boolean;
}

interface AccountMenuProps {
  user: AccountUser;
  logout: () => void | Promise<void>;
  logoutLoading?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}

export default function AccountMenu({
  user,
  logout,
  logoutLoading = false,
  mobile = false,
  onNavigate,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);


  useEffect(() => {
    if (!open) return;

    function outsideClick(event: PointerEvent) {
      if (
        !containerRef.current?.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener(
      "pointerdown",
      outsideClick
    );

    document.addEventListener(
      "keydown",
      keyboard
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        outsideClick
      );

      document.removeEventListener(
        "keydown",
        keyboard
      );
    };
  }, [open]);

  const name = user.name || "My Account";

  const isAdmin = user.role === "admin";
  const isVendor = user.role === "vendor";
  const isCustomer = user.role === "customer";

  const roleLabel = isAdmin
    ? "Administrator"
    : isVendor
      ? "Restaurant Vendor"
      : isCustomer
        ? "Customer"
        : "Member";

  const RoleIcon = isAdmin
    ? ShieldCheck
    : isVendor
      ? Store
      : UserRound;

  function closeMenu() {
    setOpen(false);
    onNavigate?.();
  }

  function avatar(size: "small" | "large") {
    return (
      <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-[#E51B23]/40 bg-[#280808] ${
        size === "large"
          ? "h-12 w-12"
          : "h-9 w-9"
      }`}>
        {user.image && failedImageUrl !== user.image ? (
          <img
            src={user.image}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setFailedImageUrl(user.image ?? null)}
            className="h-full w-full object-cover"
          />
        ) : (
          <UserRound
            size={size === "large" ? 25 : 20}
            className="text-[#FF4545]"
          />
        )}
      </span>
    );
  }

  const linkClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-white transition hover:bg-[#251010]";

  function menuContent() {
    return (
      <>
        <div className="flex items-center gap-3 px-3 py-4">

          {avatar("large")}

          <div className="min-w-0 flex-1">

            <p className="truncate text-sm font-bold text-white">
              {name}
            </p>

            {user.email && (
              <p className="mt-1 truncate text-xs text-white/60">
                {user.email}
              </p>
            )}

            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#FF4545]">
              <RoleIcon size={13} />
              {roleLabel}
            </p>

          </div>

        </div>

        <div className="my-2 border-t border-[#351010]" />

        {user.isBlocked ? (
          <p className="px-3 py-3 text-sm text-red-400">
            Your account has been blocked.
          </p>
        ) : (
          <>
            <Link
              href="/dashboard"
              onClick={closeMenu}
              className={linkClass}
            >
              <LayoutDashboard size={19} />
              Dashboard
            </Link>

            {!isAdmin && (
              <Link
                href="/profile"
                onClick={closeMenu}
                className={linkClass}
              >
                <Settings size={19} />
                Profile Settings
              </Link>
            )}

            {isVendor && (
              <Link
                href="/dashboard/vendor/subscription"
                onClick={closeMenu}
                className={linkClass}
              >
                <Crown
                  size={19}
                  className="text-[#FF4545]"
                />
                Subscription
              </Link>
            )}
          </>
        )}

        <div className="my-2 border-t border-[#351010]" />

        <button
          type="button"
          disabled={logoutLoading}
          onClick={async () => {
            await logout();
            closeMenu();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-[#FF4545] hover:bg-[#280808] disabled:opacity-50"
        >
          {logoutLoading ? (
            <LoaderCircle
              size={19}
              className="animate-spin"
            />
          ) : (
            <LogOut size={19} />
          )}

          {logoutLoading
            ? "Signing out..."
            : "Logout"}
        </button>

      </>
    );
  }

  if (mobile) {
    return (
      <div className="w-full rounded-xl border border-[#351010] bg-[#141414] p-2">
        {menuContent()}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label="Account options"
        className="flex items-center gap-2 rounded-xl border border-[#351010] bg-[#141414] px-3 py-2 text-white transition hover:border-[#E51B23]"
      >

        {avatar("small")}

        <span className="max-w-[115px] truncate text-sm font-semibold">
          {name}
        </span>

        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />

      </button>

      <AnimatePresence>

        {open && (

          <motion.div
            initial={{
              opacity: 0,
              y: -8,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -8,
              scale: 0.97,
            }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-[100] mt-3 w-[265px] max-w-[calc(100vw-24px)] rounded-2xl border border-[#351010] bg-[#141414] p-2 text-white shadow-2xl"
          >
            {menuContent()}
          </motion.div>

        )}

      </AnimatePresence>

    </div>
  );
}
