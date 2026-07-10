"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  Info,
  ListOrdered,
  PlusCircle,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/pedido", label: "Nuevo", icon: PlusCircle },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/resumen", label: "Resumen", icon: BarChart3 },
];

const adminItems = [
  { href: "/admin/menus", label: "Menus", icon: UtensilsCrossed },
  { href: "/admin/pedidos", label: "Registro", icon: ListOrdered },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/acerca", label: "Acerca", icon: Info },
];

export function BottomNav() {
  const pathname = usePathname();
  const navItems = [...items, ...adminItems];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)]">
      <div
        className="mx-auto grid max-w-md md:max-w-3xl"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
