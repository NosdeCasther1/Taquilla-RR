import type { Metadata, Viewport } from "next";
import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = {
  title: "Mis pedidos — Taquilla RR",
  description: "Historial de tus pedidos",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function MisPedidosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/40">
      <PublicHeader />
      <main className="mx-auto max-w-md px-4 py-6">{children}</main>
    </div>
  );
}
