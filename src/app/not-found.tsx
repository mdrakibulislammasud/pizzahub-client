import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="grid min-h-[75vh] place-items-center px-6 text-center">
      <div>
        <p className="ph-serif text-7xl font-bold text-[#c93628]">404</p>
        <h1 className="ph-serif mt-3 text-3xl font-bold">This slice is missing.</h1>
        <p className="mt-2 text-sm text-[#88766a]">The page you’re looking for doesn’t exist or has moved.</p>
        <Button asChild className="mt-6"><Link href="/"><ArrowLeft size={16} /> Back to home</Link></Button>
      </div>
    </main>
  );
}
