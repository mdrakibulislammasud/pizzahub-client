import DashboardAnalyticsShortcut from "./components/DashboardAnalyticsShortcut";
import TrackOrderHomeButton from "./components/TrackOrderHomeButton";
import AppThemeProvider from "./components/AppThemeProvider";

import type { Metadata, Viewport } from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import "./globals.css";
import "./hero-fullwidth.css";
import "./pizzahub-theme.css";
import "./pizzahub-brand.css";
import "./pizzahub-desktop-links.css";
import "./pizzahub-mobile-hero.css";
import "./pizzahub-track-home.css";
import "./theme-mode.css";

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
  description: "Discover your favourite pizzas from local restaurants.",
  applicationName: "PizzaHub",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080808",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      data-scroll-behavior="smooth"
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <meta name="darkreader-lock" content="" />
      </head>

      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <AppThemeProvider>
          {children}
          <TrackOrderHomeButton />
          <DashboardAnalyticsShortcut />
        </AppThemeProvider>
      </body>
    </html>
  );
}

