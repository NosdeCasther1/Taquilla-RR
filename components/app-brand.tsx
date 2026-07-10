import { cn } from "@/lib/utils";

type AppBrandProps = {
  showTitle?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: { logo: "h-8", gap: "gap-2", title: "text-sm" },
  md: { logo: "h-10", gap: "gap-2.5", title: "text-base" },
  lg: { logo: "h-16", gap: "gap-3", title: "text-xl" },
};

export function AppBrand({ showTitle = true, size = "sm", className }: AppBrandProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex min-w-0 items-center", s.gap, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/rey-de-reyes.png"
        alt="Rey de Reyes"
        className={cn(s.logo, "w-auto shrink-0 object-contain")}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/abiel.png"
        alt="Abiel — Embajadores de Cristo"
        className={cn(s.logo, "w-auto shrink-0 object-contain")}
      />
      {showTitle && <span className={cn("truncate font-semibold", s.title)}>Taquilla RR</span>}
    </div>
  );
}
