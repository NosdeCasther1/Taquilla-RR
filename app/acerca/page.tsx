import Link from "next/link";
import { ArrowLeft, Code2, HeartHandshake, Sparkles } from "lucide-react";
import { AppBrand } from "@/components/app-brand";
import { PublicHeader } from "@/components/public-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const credits = {
  appName: "Taquilla RR",
  developedBy: "Ingeniero Edson Castillo",
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

            <Button asChild className="w-full">
              <Link href="/pedidos">
                <ArrowLeft className="h-4 w-4" />
                Volver al sistema
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
