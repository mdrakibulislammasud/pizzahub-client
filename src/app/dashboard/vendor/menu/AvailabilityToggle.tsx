
"use client";

import { useRef, useState } from "react";

import { motion, MotionConfig } from "motion/react";

import {
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";

import { toast } from "sonner";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

interface MenuItem {
  _id?: string;
  status: string;
  isActive?: boolean;
}

interface Props {
  item: MenuItem;
  onChanged: (active: boolean) => void;
}

export default function AvailabilityToggle({
  item,
  onChanged,
}: Props) {

  const [saving, setSaving] = useState(false);

  const lock = useRef(false);

  const active = item.isActive !== false;

  const approved = item.status === "approved";

  async function toggleAvailability() {

    if (
      !item._id ||
      !approved ||
      lock.current
    ) {
      return;
    }

    try {

      lock.current = true;
      setSaving(true);

      const tokenResponse = await fetch(
        `${API}/api/auth/token`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const auth = await tokenResponse.json()
        .catch(() => null);

      if (!tokenResponse.ok || !auth?.token) {

        throw new Error(
          "Please sign in again."
        );

      }

      const response = await fetch(
        `${API}/api/menu/vendor/${encodeURIComponent(item._id)}/availability`,
        {
          method: "PATCH",

          credentials: "include",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },

          body: JSON.stringify({
            isActive: !active,
          }),
        }
      );

      const result = await response.json()
        .catch(() => null);

      if (
        !response.ok ||
        result?.success !== true
      ) {

        throw new Error(
          result?.message ||
          "Unable to update availability."
        );

      }

      const updatedActive =
        result.data?.isActive;

      if (typeof updatedActive !== "boolean") {

        throw new Error(
          "The server did not confirm availability."
        );

      }

      onChanged(updatedActive);

      toast.success(
        updatedActive
          ? "Pizza is now available."
          : "Pizza is now unavailable."
      );

    } catch (err) {

      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to update availability."
      );

    } finally {

      lock.current = false;
      setSaving(false);

    }
  }

  if (!approved) {

    return (

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#351010] bg-[#080808] p-3 text-xs text-white/60">

        <EyeOff size={17} />

        {item.status === "pending"
          ? "Awaiting admin approval"
          : "Unavailable until admin approval"}

      </div>

    );

  }

  return (

    <MotionConfig reducedMotion="user">

      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-[#351010] bg-[#080808] p-4">

        <div className="min-w-0">

          <div className="flex items-center gap-2">

            {active ? (

              <Eye
                size={17}
                className="shrink-0 text-green-400"
              />

            ) : (

              <EyeOff
                size={17}
                className="shrink-0 text-[#FF4545]"
              />

            )}

            <p className="text-sm font-bold text-white">

              {active
                ? "Available"
                : "Unavailable"}

            </p>

          </div>

          <p className="mt-2 text-xs leading-5 text-white/60">

            {active
              ? "Customers can view and order this item."
              : "Hidden from customers."}

          </p>

        </div>

        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label="Change menu availability"
          disabled={saving || !item._id}
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            void toggleAvailability();
          }}
          className={`relative flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
            active
              ? "bg-green-600"
              : "bg-[#444444]"
          }`}
        >

          {saving ? (

            <LoaderCircle
              size={18}
              className="mx-auto animate-spin text-white"
            />

          ) : (

            <motion.span
              initial={false}
              animate={{
                x: active ? 20 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 32,
              }}
              className="block h-5 w-5 rounded-full bg-white shadow"
            />

          )}

        </button>

      </div>

    </MotionConfig>

  );

}
