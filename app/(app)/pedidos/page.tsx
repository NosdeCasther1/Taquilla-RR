"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Bell, Check, PackageX, RotateCcw, StickyNote, Users, XCircle } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNewOrderAlerts } from "@/hooks/use-new-order-alerts";
import { requestNotificationPermission } from "@/lib/notifications";
import { cn, formatQ } from "@/lib/utils";

type OrderStatus = "PENDIENTE" | "ENTREGADO" | "CANCELADO" | "AGOTADO";

type Order = {
  id: string;
  menuName: string;
  price: number;
  customerName: string;
  row: string;
  grupo: number;
  notes: string | null;
  status: OrderStatus;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  deliveredByName: string | null;
};

type Filter = "PENDIENTE" | "ENTREGADO" | "CANCELADO" | "AGOTADO" | "TODOS";
type AdminAction = "CANCELADO" | "AGOTADO";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const filters: { value: Filter; label: string }[] = [
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "ENTREGADO", label: "Entregados" },
  { value: "CANCELADO", label: "Anulados" },
  { value: "AGOTADO", label: "Agotados" },
  { value: "TODOS", label: "Todos" },
];

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
}

function statusLabel(status: OrderStatus) {
  if (status === "PENDIENTE") return "Pendiente";
  if (status === "ENTREGADO") return "Entregado";
  if (status === "AGOTADO") return "Agotado";
  return "Anulado";
}

function statusVariant(status: OrderStatus): "warning" | "success" | "secondary" | "destructive" {
  if (status === "PENDIENTE") return "warning";
  if (status === "ENTREGADO") return "success";
  if (status === "AGOTADO") return "destructive";
  return "secondary";
}

export default function PedidosPage() {
  const [filter, setFilter] = useState<Filter>("PENDIENTE");
  const [updating, setUpdating] = useState<string | null>(null);
  const [adminAction, setAdminAction] = useState<{ order: Order; status: AdminAction } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  const url = filter === "TODOS" ? "/api/orders" : `/api/orders?status=${filter}`;
  const { data: orders, isLoading, mutate } = useSWR<Order[]>(url, fetcher, {
    refreshInterval: 4000,
  });

  const { data: pendingOrders, mutate: mutatePending } = useSWR<Order[]>(
    "/api/orders?status=PENDIENTE",
    fetcher,
    { refreshInterval: 4000 }
  );

  const pendingCount = pendingOrders?.length ?? 0;
  const { unseenIds, markSeen } = useNewOrderAlerts(pendingOrders, pendingCount);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setNotificationsEnabled(Notification.permission === "granted");
    setShowNotifPrompt(Notification.permission === "default");
  }, []);

  async function enableNotifications() {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    setShowNotifPrompt(false);
  }

  async function setStatus(order: Order, status: OrderStatus) {
    markSeen(order.id);
    setUpdating(order.id);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "No se pudo actualizar el pedido");
      return false;
    }

    mutate();
    mutatePending();
    return true;
  }

  async function confirmAdminAction() {
    if (!adminAction) return;
    setActionError(null);
    const ok = await setStatus(adminAction.order, adminAction.status);
    if (ok) setAdminAction(null);
  }

  return (
    <div className="space-y-4">
      {showNotifPrompt && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-start gap-2">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm">Activa notificaciones para saber cuando llega un pedido nuevo.</p>
          </div>
          <Button size="sm" variant="outline" onClick={enableNotifications}>
            Activar
          </Button>
        </div>
      )}

      {notificationsEnabled && (
        <p className="text-center text-xs text-muted-foreground">Notificaciones activas</p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-md border py-2 text-sm font-medium transition-colors",
              filter === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
            {f.value === "PENDIENTE" && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Cargando pedidos...</p>}

      {!isLoading && orders?.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {filter === "PENDIENTE" ? "No hay pedidos pendientes." : "No hay pedidos aqui."}
        </p>
      )}

      <div className="space-y-3">
        {orders?.map((order) => {
          const isUnseen = unseenIds.has(order.id);
          const closed = order.status !== "PENDIENTE";
          return (
            <Card
              key={order.id}
              className={cn(
                closed && "opacity-75",
                (order.status === "CANCELADO" || order.status === "AGOTADO") && "border-dashed",
                isUnseen && "border-2 border-primary shadow-md ring-2 ring-primary/20"
              )}
              onClick={() => markSeen(order.id)}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold leading-tight">{order.customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.menuName} - {formatQ(order.price)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isUnseen && (
                      <Badge variant="default" className="animate-pulse">
                        Nuevo
                      </Badge>
                    )}
                    <Badge variant={statusVariant(order.status)}>
                      {statusLabel(order.status)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    Fila {order.row} - Grupo {order.grupo}
                  </span>
                </div>

                {order.notes && (
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                    {order.notes}
                  </p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {hora(order.createdAt)}
                    {order.deliveredByName && ` - entregado por ${order.deliveredByName}`}
                    {order.deliveredAt && ` - ${hora(order.deliveredAt)}`}
                    {order.cancelledAt && ` - cerrado ${hora(order.cancelledAt)}`}
                  </p>
                  {order.status === "PENDIENTE" ? (
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(order, "ENTREGADO");
                        }}
                        disabled={updating === order.id}
                      >
                        <Check className="h-4 w-4" />
                        Entregar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionError(null);
                          setAdminAction({ order, status: "AGOTADO" });
                        }}
                        disabled={updating === order.id}
                      >
                        <PackageX className="h-4 w-4" />
                        Agotado
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionError(null);
                          setAdminAction({ order, status: "CANCELADO" });
                        }}
                        disabled={updating === order.id}
                      >
                        <XCircle className="h-4 w-4" />
                        Anular
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatus(order, "PENDIENTE");
                      }}
                      disabled={updating === order.id}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Revertir
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ActionDialog
        open={!!adminAction}
        title={adminAction?.status === "AGOTADO" ? "Marcar como agotado" : "Anular pedido"}
        description={
          adminAction
            ? adminAction.status === "AGOTADO"
              ? `Se notificara al cliente que "${adminAction.order.menuName}" esta agotado.`
              : `Se anulara el pedido de ${adminAction.order.customerName} y el cliente vera el cambio.`
            : ""
        }
        confirmLabel={adminAction?.status === "AGOTADO" ? "Marcar agotado" : "Anular"}
        busyLabel="Actualizando..."
        busy={!!updating}
        error={actionError}
        variant="destructive"
        onOpenChange={(open) => {
          if (!open) {
            setAdminAction(null);
            setActionError(null);
          }
        }}
        onConfirm={confirmAdminAction}
      />
    </div>
  );
}
