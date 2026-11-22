"use client";

import { usePathname } from "next/navigation";
import { PackageSearch, ArrowRight } from "lucide-react";

export default function TrackOrderHomeButton() {
  const pathname = usePathname();

  if (pathname !== "/") {
    return null;
  }

  return (
    <a
      href="/track-order"
      aria-label="Track your pizza order"
      className="ph-floating-track-order"
      style={{
        position: "fixed",
        right: "16px",
        bottom: "calc(18px + env(safe-area-inset-bottom, 0px))",
        zIndex: 2147483000,
        pointerEvents: "auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        padding: "14px 19px",
        borderRadius: "999px",
        border: "1px solid rgba(255,255,255,.22)",
        background: "linear-gradient(135deg,#E51B23,#A90D14)",
        color: "#FFFFFF",
        boxShadow: "0 10px 32px rgba(0,0,0,.55)",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: 800,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      <PackageSearch size={21} aria-hidden="true" />
      <span>Track Order</span>
      <ArrowRight size={17} aria-hidden="true" />
    </a>
  );
}
