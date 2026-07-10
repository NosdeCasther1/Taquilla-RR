import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { LogoutButton } from "@/components/logout-button";
import { Popcorn } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    // El middleware ya protege, esto es defensa adicional.
    redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Popcorn className="h-5 w-5 text-primary" />
            <span className="font-semibold">Taquilla RR</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="max-w-[140px] truncate text-sm text-muted-foreground">
              {session.user.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pb-24 pt-4">{children}</main>
      <BottomNav isAdmin={session.user.role === "ADMIN"} />
    </div>
  );
}
