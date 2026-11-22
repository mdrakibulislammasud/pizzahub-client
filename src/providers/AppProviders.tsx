"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: "14px",
            borderColor: "var(--ph-border)",
            background: "var(--ph-card)",
            color: "var(--ph-espresso)"
          }
        }}
      />
    </ThemeProvider>
  );
}
