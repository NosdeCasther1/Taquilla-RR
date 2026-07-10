"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { CalendarDays, Download, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatQ } from "@/lib/utils";

type OrderRow = {
  id: string;
  menuName: string;
  price: number;
  customerName: string;
  row: string;
  grupo: number;
  status: "PENDIENTE" | "ENTREGADO" | "CANCELADO" | "AGOTADO";
  createdAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  deliveredByName: string | null;
};

type StatusFilter = "TODOS" | "PENDIENTE" | "ENTREGADO" | "CANCELADO" | "AGOTADO";

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

function hora(iso: string) {
  return new Date(iso).toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(s: OrderRow["status"]) {
  if (s === "PENDIENTE") return "Pendiente";
  if (s === "ENTREGADO") return "Entregado";
  if (s === "AGOTADO") return "Agotado";
  return "Anulado";
}

function exportCsv(rows: OrderRow[]) {
  const header = ["Nombre", "Menú", "Fila", "Grupo", "Precio", "Hora", "Estado", "Entregado por"];
  const lines = rows.map((r) => [
    r.customerName,
    r.menuName,
    r.row,
    String(r.grupo),
    String(r.price),
    hora(r.createdAt),
    statusLabel(r.status),
    r.deliveredByName ?? "",
  ]);
  const csv = [header, ...lines]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pedidos-taquilla-rr-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function OrdersRegistry() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("TODOS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const dateQuery = useMemo(() => buildDateQuery(from, to), [from, to]);
  const { data: orders, isLoading } = useSWR<OrderRow[]>(`/api/orders${dateQuery}`, fetcher);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchStatus = statusFilter === "TODOS" || o.status === statusFilter;
      const matchSearch =
        !q ||
        o.customerName.toLowerCase().includes(q) ||
        o.row.toLowerCase().includes(q) ||
        String(o.grupo).includes(q);
      return matchStatus && matchSearch;
    });
  }, [orders, search, statusFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, order) => {
        acc.orders += 1;
        if (order.status !== "CANCELADO" && order.status !== "AGOTADO") {
          acc.sales += order.price;
        }
        if (order.status === "PENDIENTE") acc.pending += 1;
        if (order.status === "ENTREGADO") acc.delivered += 1;
        if (order.status === "CANCELADO") acc.cancelled += 1;
        if (order.status === "AGOTADO") acc.soldOut += 1;
        return acc;
      },
      { orders: 0, sales: 0, pending: 0, delivered: 0, cancelled: 0, soldOut: 0 }
    );
  }, [filtered]);

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "TODOS", label: "Todos" },
    { value: "PENDIENTE", label: "Pendientes" },
    { value: "ENTREGADO", label: "Entregados" },
    { value: "CANCELADO", label: "Anulados" },
    { value: "AGOTADO", label: "Agotados" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Registro de pedidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o fila…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orders-from">Desde</Label>
              <Input
                id="orders-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orders-to">Hasta</Label>
              <Input
                id="orders-to"
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-md border py-2 text-xs font-medium ${
                  statusFilter === f.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Pedidos</p>
              <p className="text-xl font-bold">{totals.orders}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Ventas</p>
              <p className="text-xl font-bold text-primary">{formatQ(totals.sales)}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="text-xl font-bold">{totals.pending}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Entregados</p>
              <p className="text-xl font-bold">{totals.delivered}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Anulados</p>
              <p className="text-xl font-bold">{totals.cancelled}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Agotados</p>
              <p className="text-xl font-bold">{totals.soldOut}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            disabled={!filtered.length}
            onClick={() => exportCsv(filtered)}
          >
            <Download className="h-4 w-4" />
            Exportar CSV ({filtered.length})
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <p className="p-4 text-sm text-muted-foreground">Cargando pedidos…</p>
          )}
          {!isLoading && filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No hay pedidos que coincidan.</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Nombre</th>
                  <th className="p-3 font-medium">Menú</th>
                  <th className="p-3 font-medium">Ubicación</th>
                  <th className="p-3 font-medium">Hora</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">Entregó</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{o.customerName}</td>
                    <td className="p-3">
                      {o.menuName}
                      <span className="block text-xs text-muted-foreground">{formatQ(o.price)}</span>
                    </td>
                    <td className="p-3">
                      Fila {o.row} · G{o.grupo}
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{hora(o.createdAt)}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          o.status === "PENDIENTE"
                            ? "warning"
                            : o.status === "ENTREGADO"
                              ? "success"
                              : o.status === "AGOTADO"
                                ? "destructive"
                                : "secondary"
                        }
                      >
                        {statusLabel(o.status)}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{o.deliveredByName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
