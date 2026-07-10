"use client";

import useSWR from "swr";
import { CheckCircle2, Lock, Play, RefreshCcw, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatQ } from "@/lib/utils";

type OperationStatus = {
  open: boolean;
  activeMenus: number;
  pendingOrders: number;
  updatedAt: string | null;
};

type Summary = {
  totalOrders: number;
  totalSales: number;
  pending: number;
  delivered: number;
  cancelled: number;
  soldOut: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDate(value: string | null) {
  if (!value) return "Sin cambios registrados";
  return new Date(value).toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OperationManager() {
  const { data: operation, isLoading, mutate } = useSWR<OperationStatus>("/api/operation", fetcher, {
    refreshInterval: 4000,
  });
  const { data: summary } = useSWR<Summary>("/api/resumen", fetcher, {
    refreshInterval: 6000,
  });

  async function setOpen(open: boolean) {
    await fetch("/api/operation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ open }),
    });
    mutate();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Operacion de taquilla</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando estado...</p>}

          {operation && (
            <>
              <div className="flex items-start justify-between gap-3 rounded-lg border bg-background p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {operation.open ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {operation.open ? "Taquilla abierta" : "Taquilla cerrada"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ultimo cambio: {formatDate(operation.updatedAt)}
                    </p>
                  </div>
                </div>
                <Badge variant={operation.open ? "success" : "secondary"}>
                  {operation.open ? "Abierta" : "Cerrada"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Menus activos</p>
                  <p className="text-2xl font-bold">{operation.activeMenus}</p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold">{operation.pendingOrders}</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  size="lg"
                  disabled={operation.open || operation.activeMenus === 0}
                  onClick={() => setOpen(true)}
                >
                  <Play className="h-4 w-4" />
                  Abrir pedidos
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled={!operation.open}
                  onClick={() => setOpen(false)}
                >
                  <Lock className="h-4 w-4" />
                  Cerrar pedidos
                </Button>
              </div>

              {operation.activeMenus === 0 && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Activa al menos un menu antes de abrir pedidos.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cierre operativo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Ventas</p>
              <p className="text-xl font-bold text-primary">{formatQ(summary?.totalSales ?? 0)}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="text-xl font-bold">{summary?.pending ?? 0}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Entregados</p>
              <p className="text-xl font-bold">{summary?.delivered ?? 0}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Anulados</p>
              <p className="text-xl font-bold">{summary?.cancelled ?? 0}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Agotados</p>
              <p className="text-xl font-bold">{summary?.soldOut ?? 0}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Pedidos venta</p>
              <p className="text-xl font-bold">{summary?.totalOrders ?? 0}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Para cerrar: cierra pedidos, atiende o marca pendientes como agotados/anulados,
              revisa Registro y exporta el CSV del dia.
            </p>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={() => mutate()}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar estado
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
