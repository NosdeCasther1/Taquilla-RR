"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Banknote, CalendarDays, CheckCircle2, Download, Search, X } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
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
  paidAt: string | null;
  deliveredByName: string | null;
  paidByName: string | null;
};

type StatusFilter = "TODOS" | "PENDIENTE" | "ENTREGADO" | "CANCELADO" | "AGOTADO";

type AccountSummary = {
  key: string;
  customerName: string;
  locations: string[];
  orders: number;
  billableOrders: number;
  total: number;
  paidOrders: number;
  paidTotal: number;
  pendingTotal: number;
  pending: number;
  delivered: number;
  cancelled: number;
  soldOut: number;
  orderIds: string[];
  pendingOrderIds: string[];
};

type PaymentTarget = {
  label: string;
  pendingTotal: number;
  pendingOrderIds: string[];
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

function accountKey(order: Pick<OrderRow, "customerName">) {
  return order.customerName.trim().toLowerCase();
}

function locationLabel(order: Pick<OrderRow, "row" | "grupo">) {
  return `Fila ${order.row} - Grupo ${order.grupo}`;
}

export function OrdersRegistry() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("TODOS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedAccountKeys, setSelectedAccountKeys] = useState<string[]>([]);

  const dateQuery = useMemo(() => buildDateQuery(from, to), [from, to]);
  const { data: orders, isLoading, mutate } = useSWR<OrderRow[]>(
    `/api/orders${dateQuery}`,
    fetcher
  );

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
          if (order.paidAt) {
            acc.paid += order.price;
          } else {
            acc.due += order.price;
          }
        }
        if (order.status === "PENDIENTE") acc.pending += 1;
        if (order.status === "ENTREGADO") acc.delivered += 1;
        if (order.status === "CANCELADO") acc.cancelled += 1;
        if (order.status === "AGOTADO") acc.soldOut += 1;
        return acc;
      },
      { orders: 0, sales: 0, paid: 0, due: 0, pending: 0, delivered: 0, cancelled: 0, soldOut: 0 }
    );
  }, [filtered]);

  const accounts = useMemo(() => {
    const grouped = new Map<string, AccountSummary>();

    for (const order of filtered) {
      const key = accountKey(order);
      const current =
        grouped.get(key) ??
        {
          key,
          customerName: order.customerName,
          locations: [],
          orders: 0,
          billableOrders: 0,
          total: 0,
          paidOrders: 0,
          paidTotal: 0,
          pendingTotal: 0,
          pending: 0,
          delivered: 0,
          cancelled: 0,
          soldOut: 0,
          orderIds: [],
          pendingOrderIds: [],
        };

      current.orders += 1;
      current.orderIds.push(order.id);
      const location = locationLabel(order);
      if (!current.locations.includes(location)) {
        current.locations.push(location);
      }
      if (order.status !== "CANCELADO" && order.status !== "AGOTADO") {
        current.billableOrders += 1;
        current.total += order.price;
        if (order.paidAt) {
          current.paidOrders += 1;
          current.paidTotal += order.price;
        } else {
          current.pendingTotal += order.price;
          current.pendingOrderIds.push(order.id);
        }
      }
      if (order.status === "PENDIENTE") current.pending += 1;
      if (order.status === "ENTREGADO") current.delivered += 1;
      if (order.status === "CANCELADO") current.cancelled += 1;
      if (order.status === "AGOTADO") current.soldOut += 1;

      grouped.set(key, current);
    }

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const selectedAccounts = useMemo(
    () => accounts.filter((account) => selectedAccountKeys.includes(account.key)),
    [accounts, selectedAccountKeys]
  );
  const selectedPendingOrderIds = selectedAccounts.flatMap((account) => account.pendingOrderIds);
  const selectedPendingTotal = selectedAccounts.reduce(
    (sum, account) => sum + account.pendingTotal,
    0
  );

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "TODOS", label: "Todos" },
    { value: "PENDIENTE", label: "Pendientes" },
    { value: "ENTREGADO", label: "Entregados" },
    { value: "CANCELADO", label: "Anulados" },
    { value: "AGOTADO", label: "Agotados" },
  ];

  function toggleSelectedAccount(account: AccountSummary) {
    if (account.pendingTotal === 0) return;
    setSelectedAccountKeys((current) =>
      current.includes(account.key)
        ? current.filter((key) => key !== account.key)
        : [...current, account.key]
    );
  }

  function openPayment(target: PaymentTarget) {
    setPaymentTarget(target);
    setPaymentError(null);
  }

  async function confirmPayment() {
    if (!paymentTarget) return;
    setPaymentBusy(true);
    setPaymentError(null);

    const res = await fetch("/api/orders/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: paymentTarget.pendingOrderIds }),
    });

    setPaymentBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setPaymentError(body?.error ?? "No se pudo registrar el cobro");
      return;
    }

    setPaymentTarget(null);
    setSelectedAccountKeys([]);
    await mutate();
  }

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
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Pedidos</p>
              <p className="text-xl font-bold">{totals.orders}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Ventas</p>
              <p className="text-xl font-bold text-primary">{formatQ(totals.sales)}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Cobrado</p>
              <p className="text-xl font-bold text-green-500">{formatQ(totals.paid)}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Pendiente</p>
              <p className="text-xl font-bold text-amber-500">{formatQ(totals.due)}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Cuentas</p>
              <p className="text-xl font-bold">{accounts.length}</p>
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
        <CardHeader>
          <CardTitle>Cuentas por hermano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Calculando cuentas...</p>}
          {!isLoading && accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay cuentas para cobrar.</p>
          )}
          {selectedAccounts.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {selectedAccounts.length} cuenta{selectedAccounts.length === 1 ? "" : "s"} seleccionada
                  {selectedAccounts.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total a cobrar en efectivo: {formatQ(selectedPendingTotal)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedAccountKeys([])}
                >
                  Limpiar
                </Button>
                <Button
                  type="button"
                  disabled={selectedPendingOrderIds.length === 0}
                  onClick={() =>
                    openPayment({
                      label:
                        selectedAccounts.length === 1
                          ? selectedAccounts[0].customerName
                          : `${selectedAccounts.length} cuentas seleccionadas`,
                      pendingTotal: selectedPendingTotal,
                      pendingOrderIds: selectedPendingOrderIds,
                    })
                  }
                >
                  <Banknote className="h-4 w-4" />
                  Cobrar seleccionadas
                </Button>
              </div>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {accounts.map((account) => {
              const selected = selectedAccountKeys.includes(account.key);
              return (
              <div
                key={account.key}
                className={`rounded-md border bg-background p-3 ${
                  selected ? "border-primary ring-2 ring-primary/30" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={account.pendingTotal === 0}
                        onClick={() => toggleSelectedAccount(account)}
                        className={`h-5 w-5 shrink-0 rounded border text-xs font-bold ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        } disabled:opacity-40`}
                        aria-label={selected ? "Quitar cuenta de la seleccion" : "Seleccionar cuenta"}
                      >
                        {selected ? "✓" : ""}
                      </button>
                      <p className="truncate font-semibold">{account.customerName}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {account.locations.join(" | ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-primary">{formatQ(account.total)}</p>
                    {account.pendingTotal === 0 && account.billableOrders > 0 ? (
                      <Badge variant="success">Pagado</Badge>
                    ) : (
                      <p className="text-xs text-amber-500">
                        Pendiente {formatQ(account.pendingTotal)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded border bg-card px-2 py-1">
                    <span className="block font-semibold">{account.billableOrders}</span>
                    <span className="text-muted-foreground">Cobrar</span>
                  </div>
                  <div className="rounded border bg-card px-2 py-1">
                    <span className="block font-semibold">{account.pending}</span>
                    <span className="text-muted-foreground">Pend.</span>
                  </div>
                  <div className="rounded border bg-card px-2 py-1">
                    <span className="block font-semibold">{account.delivered}</span>
                    <span className="text-muted-foreground">Ent.</span>
                  </div>
                  <div className="rounded border bg-card px-2 py-1">
                    <span className="block font-semibold">{account.cancelled + account.soldOut}</span>
                    <span className="text-muted-foreground">Fuera</span>
                  </div>
                </div>
                <Button
                  type="button"
                  className="mt-3 w-full"
                  variant={account.pendingTotal > 0 ? "default" : "outline"}
                  disabled={account.pendingTotal === 0}
                  onClick={() =>
                    openPayment({
                      label: account.customerName,
                      pendingTotal: account.pendingTotal,
                      pendingOrderIds: account.pendingOrderIds,
                    })
                  }
                >
                  {account.pendingTotal > 0 ? (
                    <>
                      <Banknote className="h-4 w-4" />
                      Cobrar efectivo {formatQ(account.pendingTotal)}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Cuenta pagada
                    </>
                  )}
                </Button>
              </div>
              );
            })}
          </div>
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
                      {o.paidAt && (
                        <span className="block text-xs text-green-500">
                          Pagado efectivo{o.paidByName ? ` por ${o.paidByName}` : ""}
                        </span>
                      )}
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

      <ActionDialog
        open={!!paymentTarget}
        title="Cobrar en efectivo"
        description={
          paymentTarget
            ? `Se registrara el pago en efectivo de ${formatQ(paymentTarget.pendingTotal)} para ${paymentTarget.label}.`
            : ""
        }
        confirmLabel="Confirmar cobro"
        busyLabel="Registrando..."
        busy={paymentBusy}
        error={paymentError}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentTarget(null);
            setPaymentError(null);
          }
        }}
        onConfirm={confirmPayment}
      />
    </div>
  );
}
