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
type RegistryView = "RESUMEN" | "CUENTAS" | "PEDIDOS" | "CUADRE";

type AccountItem = {
  id: string;
  menuName: string;
  location: string;
  price: number;
  status: OrderRow["status"];
  paidAt: string | null;
  paidByName: string | null;
};

type AccountSummary = {
  key: string;
  customerName: string;
  locations: string[];
  items: AccountItem[];
  pendingItems: AccountItem[];
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

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "No se pudo cargar la informacion");
  }
  return res.json();
};

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

function auditText(name: string | null, iso: string | null) {
  if (!iso) return "Pendiente";
  return name ?? "Administrador";
}

function auditTime(iso: string | null) {
  return iso ? hora(iso) : null;
}

function exportCsv(rows: OrderRow[]) {
  const header = [
    "Nombre",
    "Menu",
    "Fila",
    "Grupo",
    "Precio",
    "Hora",
    "Estado",
    "Entregado por",
    "Hora entrega",
    "Cobrado por",
    "Hora cobro",
  ];
  const lines = rows.map((r) => [
    r.customerName,
    r.menuName,
    r.row,
    String(r.grupo),
    String(r.price),
    hora(r.createdAt),
    statusLabel(r.status),
    auditText(r.deliveredByName, r.deliveredAt),
    auditTime(r.deliveredAt) ?? "",
    auditText(r.paidByName, r.paidAt),
    auditTime(r.paidAt) ?? "",
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
  const [activeView, setActiveView] = useState<RegistryView>("CUENTAS");
  const [detailAccount, setDetailAccount] = useState<AccountSummary | null>(null);

  const dateQuery = useMemo(() => buildDateQuery(from, to), [from, to]);
  const { data: orders, error: ordersError, isLoading, mutate } = useSWR<OrderRow[]>(
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
          items: [],
          pendingItems: [],
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
      current.items.push({
        id: order.id,
        menuName: order.menuName,
        location,
        price: order.price,
        status: order.status,
        paidAt: order.paidAt,
        paidByName: order.paidByName,
      });
      if (order.status !== "CANCELADO" && order.status !== "AGOTADO") {
        current.billableOrders += 1;
        current.total += order.price;
        if (order.paidAt) {
          current.paidOrders += 1;
          current.paidTotal += order.price;
        } else {
          current.pendingTotal += order.price;
          current.pendingOrderIds.push(order.id);
          current.pendingItems.push({
            id: order.id,
            menuName: order.menuName,
            location,
            price: order.price,
            status: order.status,
            paidAt: order.paidAt,
            paidByName: order.paidByName,
          });
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
  const views: { value: RegistryView; label: string }[] = [
    { value: "RESUMEN", label: "Resumen" },
    { value: "CUENTAS", label: "Cuentas" },
    { value: "PEDIDOS", label: "Pedidos" },
    { value: "CUADRE", label: "Cuadre" },
  ];
  const cashiers = useMemo(() => {
    const grouped = new Map<string, { name: string; orders: number; total: number }>();

    for (const order of filtered) {
      if (!order.paidAt || order.status === "CANCELADO" || order.status === "AGOTADO") continue;
      const name = auditText(order.paidByName, order.paidAt);
      const current = grouped.get(name) ?? { name, orders: 0, total: 0 };
      current.orders += 1;
      current.total += order.price;
      grouped.set(name, current);
    }

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

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
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {views.map((view) => (
              <button
                key={view.value}
                type="button"
                onClick={() => setActiveView(view.value)}
                className={`rounded-md border py-2 text-xs font-semibold ${
                  activeView === view.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground"
                }`}
              >
                {view.label}
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

      {activeView === "RESUMEN" && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Total vendido</p>
              <p className="text-2xl font-bold text-primary">{formatQ(totals.sales)}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Total cobrado</p>
              <p className="text-2xl font-bold text-green-500">{formatQ(totals.paid)}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Pendiente</p>
              <p className="text-2xl font-bold text-amber-500">{formatQ(totals.due)}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Cuentas</p>
              <p className="text-2xl font-bold">{accounts.length}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === "CUENTAS" && (
      <Card>
        <CardHeader>
          <CardTitle>Cuentas por hermano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Calculando cuentas...</p>}
          {ordersError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {ordersError.message}
            </p>
          )}
          {!isLoading && accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay cuentas para cobrar.</p>
          )}
          {selectedAccounts.length > 0 && (
            <div className="rounded-md border bg-background p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {selectedAccounts.length} cuenta
                    {selectedAccounts.length === 1 ? "" : "s"} seleccionada
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
            </div>
          )}
          <div className="grid max-h-[46vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
            {accounts.map((account) => {
              const selected = selectedAccountKeys.includes(account.key);
              return (
              <div
                key={account.key}
                className={`rounded-md border bg-background p-3 ${
                  selected ? "border-primary ring-2 ring-primary/30" : ""
                }`}
              >
                <button
                  type="button"
                  disabled={account.pendingTotal === 0}
                  onClick={() => toggleSelectedAccount(account)}
                  className={`mb-3 ${account.pendingTotal === 0 ? "hidden" : "flex"} w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/50"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <span className="font-semibold">
                    {selected ? "Seleccionada para cobro multiple" : "Seleccionar para cobro multiple"}
                  </span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${
                      selected
                        ? "border-primary-foreground bg-primary-foreground text-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {selected ? "✓" : ""}
                  </span>
                </button>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={account.pendingTotal === 0}
                        onClick={() => toggleSelectedAccount(account)}
                        className={`hidden ${
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
                    <span className="text-muted-foreground">Productos</span>
                  </div>
                  <div className="rounded border bg-card px-2 py-1">
                    <span className="block font-semibold">{account.pending}</span>
                    <span className="text-muted-foreground">Pendientes</span>
                  </div>
                  <div className="rounded border bg-card px-2 py-1">
                    <span className="block font-semibold">{account.delivered}</span>
                    <span className="text-muted-foreground">Entregados</span>
                  </div>
                  <div className="rounded border bg-card px-2 py-1">
                    <span className="block font-semibold">{account.cancelled + account.soldOut}</span>
                    <span className="text-muted-foreground">No cobrados</span>
                  </div>
                </div>
                <Button
                  type="button"
                  className="mt-3 w-full"
                  variant="outline"
                  onClick={() => setDetailAccount(account)}
                >
                  Ver detalle
                </Button>
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
      )}

      {activeView === "CUADRE" && (
        <Card>
          <CardHeader>
            <CardTitle>Cuadre final</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Vendido</p>
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
                <p className="text-xs text-muted-foreground">Anulado/agotado</p>
                <p className="text-xl font-bold">{totals.cancelled + totals.soldOut}</p>
              </div>
            </div>
            <div className="rounded-md border">
              {cashiers.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">Aun no hay cobros registrados.</p>
              )}
              {cashiers.map((cashier) => (
                <div
                  key={cashier.name}
                  className="flex items-center justify-between border-b p-3 last:border-0"
                >
                  <div>
                    <p className="font-semibold">{cashier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cashier.orders} producto{cashier.orders === 1 ? "" : "s"} cobrado
                      {cashier.orders === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="font-bold text-green-500">{formatQ(cashier.total)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === "PEDIDOS" && (
      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <p className="p-4 text-sm text-muted-foreground">Cargando pedidos…</p>
          )}
          {ordersError && (
            <p className="p-4 text-sm text-destructive">{ordersError.message}</p>
          )}
          {!isLoading && filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No hay pedidos que coincidan.</p>
          )}
          <div className="max-h-[56vh] space-y-3 overflow-y-auto p-3 md:hidden">
            {filtered.map((o) => (
              <div key={o.id} className="rounded-md border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{o.customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      Fila {o.row} - G{o.grupo} · {hora(o.createdAt)}
                    </p>
                  </div>
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
                </div>
                <div className="mt-3 rounded border bg-card px-3 py-2">
                  <p className="font-medium">{o.menuName}</p>
                  <p className="text-sm font-bold text-primary">{formatQ(o.price)}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border bg-card p-2">
                    <p className="text-muted-foreground">Entrego</p>
                    <p className="font-semibold">{auditText(o.deliveredByName, o.deliveredAt)}</p>
                    {o.deliveredAt && <p className="text-muted-foreground">{auditTime(o.deliveredAt)}</p>}
                  </div>
                  <div className="rounded border bg-card p-2">
                    <p className="text-muted-foreground">Cobro</p>
                    <p className={o.paidAt ? "font-semibold text-green-500" : "font-semibold"}>
                      {auditText(o.paidByName, o.paidAt)}
                    </p>
                    {o.paidAt && <p className="text-muted-foreground">Efectivo · {auditTime(o.paidAt)}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden max-h-[56vh] overflow-auto md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Nombre</th>
                  <th className="p-3 font-medium">Menú</th>
                  <th className="p-3 font-medium">Ubicación</th>
                  <th className="p-3 font-medium">Hora</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">Entregó</th>
                  <th className="p-3 font-medium">Cobró</th>
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
                    <td className="p-3 text-muted-foreground">
                      <span className="block font-medium text-foreground">
                        {auditText(o.deliveredByName, o.deliveredAt)}
                      </span>
                      {o.deliveredAt && (
                        <span className="block text-xs">{auditTime(o.deliveredAt)}</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      <span className={o.paidAt ? "block font-medium text-green-500" : "block"}>
                        {auditText(o.paidByName, o.paidAt)}
                      </span>
                      {o.paidAt && <span className="block text-xs">Efectivo · {auditTime(o.paidAt)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

      {detailAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Cerrar detalle"
            onClick={() => setDetailAccount(null)}
          />
          <section className="relative w-full max-w-lg rounded-lg border bg-card p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{detailAccount.customerName}</h2>
                <p className="text-sm text-muted-foreground">
                  {detailAccount.locations.join(" | ")}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setDetailAccount(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded border bg-background p-2">
                <p className="font-bold">{detailAccount.billableOrders}</p>
                <p className="text-muted-foreground">Productos</p>
              </div>
              <div className="rounded border bg-background p-2">
                <p className="font-bold text-green-500">{formatQ(detailAccount.paidTotal)}</p>
                <p className="text-muted-foreground">Cobrado</p>
              </div>
              <div className="rounded border bg-background p-2">
                <p className="font-bold text-amber-500">{formatQ(detailAccount.pendingTotal)}</p>
                <p className="text-muted-foreground">Pendiente</p>
              </div>
            </div>
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {detailAccount.items.map((item) => (
                <div key={item.id} className="rounded-md border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{item.menuName}</p>
                      <p className="text-xs text-muted-foreground">{item.location}</p>
                    </div>
                    <p className="shrink-0 font-bold text-primary">{formatQ(item.price)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                    <Badge
                      variant={
                        item.status === "PENDIENTE"
                          ? "warning"
                          : item.status === "ENTREGADO"
                            ? "success"
                            : item.status === "AGOTADO"
                              ? "destructive"
                              : "secondary"
                      }
                    >
                      {statusLabel(item.status)}
                    </Badge>
                    <span className={item.paidAt ? "font-medium text-green-500" : "text-muted-foreground"}>
                      {item.paidAt ? `Cobrado por ${auditText(item.paidByName, item.paidAt)}` : "Pendiente de cobro"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

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
