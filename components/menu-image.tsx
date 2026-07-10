"use client";

import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MenuImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
};

/** Muestra la foto del menú o un placeholder si no hay imagen. */
export function MenuImage({ src, alt, className }: MenuImageProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={cn("object-cover", className)} />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-muted text-muted-foreground",
        className
      )}
      aria-label={alt}
    >
      <ImageIcon className="h-8 w-8 opacity-40" />
    </div>
  );
}
