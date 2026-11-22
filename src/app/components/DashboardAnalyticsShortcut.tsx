"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ArrowUpRight,
} from "lucide-react";

export default function DashboardAnalyticsShortcut() {
  const pathname = usePathname();

  const currentPath =
    pathname.replace(/\/+$/, "") || "/";

  let destination = "";
  let label = "";

  if (currentPath === "/dashboard/admin") {
    destination = "/dashboard/admin/analytics";
    label = "Admin Analytics";
  } else if (currentPath === "/dashboard/vendor") {
    destination = "/dashboard/vendor/analytics";
    label = "Vendor Analytics";
  }

  if (!destination) {
    return null;
  }

  return (
    <Link
      href={destination}
      aria-label={`Open ${label}`}
      title={`Open ${label}`}
      className="fixed bottom-5 right-5 z-[90] inline-flex items-center justify-center gap-3 rounded-2xl border border-red-400/30 bg-[#b9232e] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_35px_rgba(150,20,30,0.35)] transition-all duration-200 hover:-translate-y-1 hover:bg-[#d32c37] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500 sm:bottom-7 sm:right-7"
    >
      <BarChart3 size={20} strokeWidth={2.2} />

      <span>View Analytics</span>

      <ArrowUpRight
        size={17}
        strokeWidth={2.2}
      />
    </Link>
  );
}
