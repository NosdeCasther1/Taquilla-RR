"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatQ } from "@/lib/utils";

type Resumen = {
  totalOrders: number;
  totalSales: number;
  pending: number;
  delivered: number;
  byMenu: { menuName: string; count: number; total: number }[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ResumenPage() {
  const { data, isLoading } = useSWR<Resumen>("/api/resumen", fetcher, {
    refreshInterval: 4000,
  });

  if (isLoading || !data) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Cargando resumen…</p>;
  }

  const stats = [
    { label: "Ventas totales", value: formatQ(data.totalSales), highlight: true },
    { label: "Pedidos", value: String(data.totalOrders) },
    { label: "Pendientes", value: String(data.pending) },
    { label: "Entregados", value: String(data.delivered) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
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
          <CardTitle>Ventas por menú</CardTitle>
        </CardHeader>
        <CardContent>
          {data.byMenu.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay pedidos.</p>
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
    </div>
  );
}
