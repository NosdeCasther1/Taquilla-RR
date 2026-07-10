import type { Metadata, Viewport } from "next";
import { Popcorn } from "lucide-react";

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
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto flex h-14 max-w-md items-center justify-center gap-2 px-4">
          <Popcorn className="h-5 w-5 text-primary" />
          <span className="font-semibold">Taquilla RR</span>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-6">{children}</main>
    </div>
  );
}
