import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#c93628]">{eyebrow}</p> : null}
      <h2 className="ph-serif text-3xl font-bold tracking-tight text-[#35251f] sm:text-4xl">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-[#88766a] sm:text-base">{description}</p> : null}
    </div>
  );
}
