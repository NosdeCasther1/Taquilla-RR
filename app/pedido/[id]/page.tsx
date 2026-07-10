"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { History, StickyNote, Users, XCircle } from "lucide-react";
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
  status: "PENDIENTE" | "ENTREGADO" | "CANCELADO";
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
      return <Badge variant="secondary">Cancelado</Badge>;
  }
}

export default function PedidoReciboPage({ params }: { params: { id: string } }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data: order, error, isLoading, mutate } = useSWR<OrderReceipt>(
    `/api/orders/${params.id}`,
    fetcher,
    { refreshInterval: 4000 }
  );

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
            {order.cancelledAt && ` - cancelado ${hora(order.cancelledAt)}`}
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
