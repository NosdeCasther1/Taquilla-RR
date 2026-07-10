import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["PENDIENTE", "ENTREGADO", "CANCELADO"]),
});

function serializeOrder(o: {
  id: string;
  customerName: string;
  row: string;
  grupo: number;
  notes: string | null;
  status: OrderStatus;
  price: { toString(): string } | number;
  createdAt: Date;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  menu: { name: string; imageUrl?: string | null };
  deliveredBy?: { name: string } | null;
}) {
  return {
    id: o.id,
    menuName: o.menu.name,
    menuImageUrl: o.menu.imageUrl ?? null,
    price: Number(o.price),
    customerName: o.customerName,
    row: o.row,
    grupo: o.grupo,
    notes: o.notes,
    status: o.status,
    deliveredAt: o.deliveredAt,
    cancelledAt: o.cancelledAt,
    createdAt: o.createdAt,
    deliveredByName: o.deliveredBy?.name ?? null,
  };
}

/** GET /api/orders/[id] — recibo público del pedido (polling desde /pedido/[id]). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      menu: { select: { name: true, imageUrl: true } },
      deliveredBy: { select: { name: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  return NextResponse.json(serializeOrder(order));
}

/** PATCH /api/orders/[id]
 *  - Cliente (sin sesión): solo PENDIENTE → CANCELADO.
 *  - Staff: ENTREGADO (registra deliveredById/deliveredAt) o revertir a PENDIENTE. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  // --- Cliente anula su pedido ---
  if (!session?.user) {
    if (parsed.data.status !== "CANCELADO" || order.status !== OrderStatus.PENDIENTE) {
      return NextResponse.json({ error: "No permitido" }, { status: 403 });
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: { status: OrderStatus.CANCELADO, cancelledAt: new Date() },
      include: {
        menu: { select: { name: true, imageUrl: true } },
        deliveredBy: { select: { name: true } },
      },
    });
    return NextResponse.json(serializeOrder(updated));
  }

  // --- Staff ---
  if (parsed.data.status === "CANCELADO") {
    return NextResponse.json({ error: "Solo el cliente puede cancelar" }, { status: 403 });
  }

  if (parsed.data.status === "ENTREGADO") {
    if (order.status !== OrderStatus.PENDIENTE) {
      return NextResponse.json({ error: "Solo se pueden entregar pedidos pendientes" }, { status: 400 });
    }
    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: OrderStatus.ENTREGADO,
        deliveredAt: new Date(),
        deliveredById: session.user.id,
      },
      include: {
        menu: { select: { name: true, imageUrl: true } },
        deliveredBy: { select: { name: true } },
      },
    });
    return NextResponse.json(serializeOrder(updated));
  }

  // Revertir a PENDIENTE
  if (order.status !== OrderStatus.ENTREGADO) {
    return NextResponse.json({ error: "Solo se pueden revertir pedidos entregados" }, { status: 400 });
  }
  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      status: OrderStatus.PENDIENTE,
      deliveredAt: null,
      deliveredById: null,
    },
    include: {
      menu: { select: { name: true, imageUrl: true } },
      deliveredBy: { select: { name: true } },
    },
  });
  return NextResponse.json(serializeOrder(updated));
}
