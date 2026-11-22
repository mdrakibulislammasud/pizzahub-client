"use client";

import dynamic from "next/dynamic";

const HomeClient = dynamic(
  () => import("../HomeClient"),
  {
    ssr: false,
    loading: () => (
      <div className="ph-menu-loading">
        Loading PizzaHub menu...
      </div>
    ),
  }
);

export default function BrowseMenuPage() {
  return (
    <div className="ph-browse-page">
      <HomeClient />
    </div>
  );
}
