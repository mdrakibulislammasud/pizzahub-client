import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2 text-sm text-[#88766a]", className)} role="status" aria-live="polite">
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
