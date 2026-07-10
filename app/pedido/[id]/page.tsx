"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { AlertTriangle, History, PackageX, StickyNote, Users, XCircle } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MenuImage } from "@/components/menu-image";
import { formatQ } from "@/lib/utils";

type OrderReceipt = {
  id: string;
  menuName: string;
  menuImageUrl: string | null;
  price: number;
  customerName: string;
  row: string;
  grupo: number;
  notes: string | null;
  status: "PENDIENTE" | "ENTREGADO" | "CANCELADO" | "AGOTADO";
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: OrderReceipt["status"]) {
  switch (status) {
    case "PENDIENTE":
      return <Badge variant="warning">Pendiente</Badge>;
    case "ENTREGADO":
      return <Badge variant="success">Entregado</Badge>;
    case "CANCELADO":
      return <Badge variant="secondary">Anulado</Badge>;
    case "AGOTADO":
      return <Badge variant="destructive">Agotado</Badge>;
  }
}

export default function PedidoReciboPage({ params }: { params: { id: string } }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const lastStatusRef = useRef<OrderReceipt["status"] | null>(null);

  const { data: order, error, isLoading, mutate } = useSWR<OrderReceipt>(
    `/api/orders/${params.id}`,
    fetcher,
    { refreshInterval: 4000 }
  );

  useEffect(() => {
    if (!order) return;
    const previous = lastStatusRef.current;
    lastStatusRef.current = order.status;

    if (previous === "PENDIENTE" && (order.status === "CANCELADO" || order.status === "AGOTADO")) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Actualizacion de pedido - Taquilla RR", {
          body:
            order.status === "AGOTADO"
              ? `${order.menuName} esta agotado.`
              : `Tu pedido de ${order.menuName} fue anulado.`,
          tag: `order-status-${order.id}`,
        });
      }
    }
  }, [order]);

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    const res = await fetch(`/api/orders/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELADO" }),
    });
    setCancelling(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setCancelError(body?.error ?? "No se pudo anular el pedido");
      return;
    }

    setCancelDialogOpen(false);
    mutate();
  }

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Cargando pedido...</p>;
  }

  if (error || !order?.id) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <p className="text-muted-foreground">No encontramos este pedido.</p>
          <Button asChild>
            <Link href="/ordenar">Hacer un pedido</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">Tu pedido</p>
              <p className="text-lg font-semibold">{order.customerName}</p>
            </div>
            {statusBadge(order.status)}
          </div>

          {order.status === "AGOTADO" && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
              <PackageX className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Producto agotado</p>
                <p className="text-sm">
                  El staff marco este combo como agotado. Por favor elige otro combo o consulta en taquilla.
                </p>
              </div>
            </div>
          )}

          {order.status === "CANCELADO" && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Pedido anulado</p>
                <p className="text-sm">Este pedido fue anulado y ya no contara como venta.</p>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border">
            <MenuImage
              src={order.menuImageUrl}
              alt={order.menuName}
              className="aspect-[16/9] w-full"
            />
            <div className="p-3">
              <p className="font-semibold">{order.menuName}</p>
              <p className="text-sm font-bold text-primary">{formatQ(order.price)}</p>
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

          <p className="text-xs text-muted-foreground">
            Pedido a las {hora(order.createdAt)}
            {order.deliveredAt && ` - entregado ${hora(order.deliveredAt)}`}
            {order.cancelledAt && ` - cerrado ${hora(order.cancelledAt)}`}
          </p>

          {order.status === "PENDIENTE" && (
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => {
                setCancelDialogOpen(true);
                setCancelError(null);
              }}
              disabled={cancelling}
            >
              <XCircle className="h-4 w-4" />
              {cancelling ? "Anulando..." : "Anular pedido"}
            </Button>
          )}

          {order.status === "PENDIENTE" && (
            <p className="text-center text-xs text-muted-foreground">
              El estado se actualiza automaticamente.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="w-full" asChild>
          <Link href="/mis-pedidos">
            <History className="h-4 w-4" />
            Mis pedidos
          </Link>
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/ordenar">Hacer otro pedido</Link>
        </Button>
      </div>

      <ActionDialog
        open={cancelDialogOpen}
        title="Anular pedido"
        description="Este pedido quedara marcado como cancelado y ya no contara como venta."
        confirmLabel="Anular pedido"
        busyLabel="Anulando..."
        busy={cancelling}
        error={cancelError}
        variant="destructive"
        onOpenChange={(open) => {
          setCancelDialogOpen(open);
          if (!open) setCancelError(null);
        }}
        onConfirm={handleCancel}
      />
    </div>
  );
}
