import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export default function Loading() {
  return <main className="grid min-h-[60vh] place-items-center"><LoadingSpinner label="Preparing something delicious..." /></main>;
}
