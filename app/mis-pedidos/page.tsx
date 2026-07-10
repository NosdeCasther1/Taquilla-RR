"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MenuImage } from "@/components/menu-image";
import { formatQ } from "@/lib/utils";
import { getOrderIds } from "@/lib/order-storage";

type OrderSummary = {
  id: string;
  menuName: string;
  menuImageUrl: string | null;
  price: number;
  customerName: string;
  row: string;
  grupo: number;
  status: "PENDIENTE" | "ENTREGADO" | "CANCELADO";
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: OrderSummary["status"]) {
  switch (status) {
    case "PENDIENTE":
      return <Badge variant="warning">Pendiente</Badge>;
    case "ENTREGADO":
      return <Badge variant="success">Entregado</Badge>;
    case "CANCELADO":
      return <Badge variant="secondary">Cancelado</Badge>;
  }
}

export default function MisPedidosPage() {
  const [orderIds, setOrderIds] = useState<string[]>([]);

  useEffect(() => {
    setOrderIds(getOrderIds());
  }, []);

  const url = useMemo(() => {
    if (orderIds.length === 0) return null;
    return `/api/orders/mine?ids=${orderIds.join(",")}`;
  }, [orderIds]);

  const { data: orders, isLoading } = useSWR<OrderSummary[]>(url, fetcher, {
    refreshInterval: 8000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
        <History className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-medium">Mis pedidos</p>
          <p className="text-sm text-muted-foreground">
            Pedidos hechos desde este dispositivo en la noche de cine.
          </p>
        </div>
      </div>

      {orderIds.length === 0 && (
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <p className="text-muted-foreground">Aún no tienes pedidos en este dispositivo.</p>
            <Button asChild>
              <Link href="/ordenar">Hacer un pedido</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {orderIds.length > 0 && isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando historial…</p>
      )}

      {orderIds.length > 0 && !isLoading && orders?.length === 0 && (
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <p className="text-muted-foreground">No encontramos pedidos guardados en este dispositivo.</p>
            <Button asChild>
              <Link href="/ordenar">Hacer un pedido</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {orders?.map((order) => (
          <Link key={order.id} href={`/pedido/${order.id}`} className="block">
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-3 p-3">
                <MenuImage
                  src={order.menuImageUrl}
                  alt={order.menuName}
                  className="h-16 w-16 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold">{order.menuName}</p>
                    {statusBadge(order.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.customerName} · Fila {order.row} · Grupo {order.grupo}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-primary">{formatQ(order.price)}</p>
                    <p className="text-xs text-muted-foreground">
                      {hora(order.createdAt)}
                      {order.deliveredAt && ` · entregado ${hora(order.deliveredAt)}`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Button variant="outline" className="w-full" asChild>
        <Link href="/ordenar">Hacer otro pedido</Link>
      </Button>
    </div>
  );
}
