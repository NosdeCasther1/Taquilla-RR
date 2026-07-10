import Link from "next/link";
import { Code2, HeartHandshake, Info, Sparkles } from "lucide-react";
import { AppBrand } from "@/components/app-brand";
import { PublicHeader } from "@/components/public-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const credits = {
  appName: "Taquilla RR",
  developedBy: "Rey de Reyes / Abiel - Embajadores de Cristo",
  purpose: "Sistema de pedidos creado para apoyar la atencion durante Noche de Cine.",
};

export default function AcercaPage() {
  return (
    <div className="min-h-dvh bg-muted/40">
      <PublicHeader />
      <main className="mx-auto max-w-md space-y-4 px-4 py-6 md:max-w-3xl">
        <Card>
          <CardHeader className="items-center text-center">
            <AppBrand size="lg" className="justify-center" />
            <CardTitle className="pt-2 text-xl">Acerca de {credits.appName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-background p-4 text-center">
              <p className="text-sm text-muted-foreground">Desarrollado por</p>
              <p className="mt-1 text-lg font-semibold">{credits.developedBy}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-background p-4">
                <HeartHandshake className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">Proposito</p>
                <p className="mt-1 text-sm text-muted-foreground">{credits.purpose}</p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <Code2 className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">Proyecto</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Aplicacion web para gestionar menus, pedidos, entregas y resumen de ventas.
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">Evento</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pensada para uso movil durante el evento y tambien para control en computadora.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link href="/ordenar">Ordenar</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/login">
                  <Info className="h-4 w-4" />
                  Staff
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
