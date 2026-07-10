"use client";

import { useMemo, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatQ } from "@/lib/utils";

type Resumen = {
  totalOrders: number;
  totalSales: number;
  pending: number;
  delivered: number;
  cancelled: number;
  byMenu: { menuName: string; count: number; total: number }[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function todayValue() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });
}

function buildDateQuery(from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function ResumenPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const dateQuery = useMemo(() => buildDateQuery(from, to), [from, to]);
  const { data, isLoading } = useSWR<Resumen>(`/api/resumen${dateQuery}`, fetcher, {
    refreshInterval: 4000,
  });

  const stats = data
    ? [
        { label: "Ventas totales", value: formatQ(data.totalSales), highlight: true },
        { label: "Pedidos", value: String(data.totalOrders) },
        { label: "Pendientes", value: String(data.pending) },
        { label: "Entregados", value: String(data.delivered) },
        { label: "Cancelados", value: String(data.cancelled) },
      ]
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="summary-from">Desde</Label>
              <Input
                id="summary-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary-to">Hasta</Label>
              <Input
                id="summary-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const today = todayValue();
                setFrom(today);
                setTo(today);
              }}
            >
              <CalendarDays className="h-4 w-4" />
              Hoy
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!from && !to}
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              <X className="h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading || !data ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando resumen...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={s.highlight ? "text-2xl font-bold text-primary" : "text-2xl font-bold"}>
                    {s.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ventas por menu</CardTitle>
            </CardHeader>
            <CardContent>
              {data.byMenu.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay pedidos en este rango.</p>
              ) : (
                <ul className="divide-y">
                  {data.byMenu.map((m) => (
                    <li key={m.menuName} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-medium">{m.menuName}</p>
                        <p className="text-sm text-muted-foreground">
                          {m.count} {m.count === 1 ? "pedido" : "pedidos"}
                        </p>
                      </div>
                      <p className="font-semibold">{formatQ(m.total)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
