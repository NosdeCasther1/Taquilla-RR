"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Cerrar sesión"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );
}
