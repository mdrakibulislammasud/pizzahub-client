"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("PizzaHub application error:", error); }, [error]);
  return (
    <main className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div className="max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c93628]">Something went wrong</p>
        <h1 className="ph-serif mt-3 text-4xl font-bold">Let’s get things back on track.</h1>
        <p className="mt-3 text-sm leading-6 text-[#88766a]">An unexpected error interrupted this page. Please try again.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
