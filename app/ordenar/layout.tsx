import type { Metadata, Viewport } from "next";
import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = {
  title: "Ordenar — Taquilla RR",
  description: "Haz tu pedido sin salir de tu asiento",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function OrdenarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/40">
      <PublicHeader />
      <main className="mx-auto max-w-md px-4 py-6">{children}</main>
    </div>
  );
}
