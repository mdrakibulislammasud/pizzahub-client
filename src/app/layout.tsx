import DashboardAnalyticsShortcut from "./components/DashboardAnalyticsShortcut";
import TrackOrderHomeButton from "./components/TrackOrderHomeButton";

import type { Metadata, Viewport } from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import { Toaster } from "sonner";

import "./globals.css";
import "./hero-fullwidth.css";
import "./pizzahub-theme.css";
import "./pizzahub-brand.css";
import "./pizzahub-desktop-links.css";
import "./pizzahub-mobile-hero.css";
import "./pizzahub-track-home.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PizzaHub",

  description:
    "Discover your favourite pizzas from local restaurants.",

  applicationName: "PizzaHub",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#080808",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth"
      lang="en"
      suppressHydrationWarning
      style={{
        colorScheme: "only dark",
        backgroundColor: "#080808",
      }}
    >
      <head>
        <meta
          name="darkreader-lock"
          content=""
        />
      </head>

      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
        style={{
          backgroundColor: "#080808",
          color: "#FFFFFF",
          colorScheme: "only dark",
        }}
      >
        {children}

        <Toaster
          position="top-right"
          theme="dark"
          closeButton
          toastOptions={{
            style: {
              background: "#141414",
              color: "#FFFFFF",
              border: "1px solid #351010",
              borderRadius: "12px",
            },
          }}
        />
              <TrackOrderHomeButton />
              <DashboardAnalyticsShortcut />
      </body>
    </html>
  );
}


