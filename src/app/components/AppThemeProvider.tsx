"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { useEffect } from "react";

function ThemeEffects() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;

    document.documentElement.style.colorScheme = resolvedTheme;

    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      resolvedTheme === "light" ? "#FAF6EE" : "#080808"
    );
  }, [resolvedTheme]);

  return null;
}

function ThemeToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="top-right"
      theme={resolvedTheme === "light" ? "light" : "dark"}
      closeButton
    />
  );
}

export default function AppThemeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="pizzahub-theme"
      disableTransitionOnChange
    >
      <ThemeEffects />
      {children}
      <ThemeToaster />
    </ThemeProvider>
  );
}
