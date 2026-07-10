import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["PENDIENTE", "ENTREGADO", "CANCELADO", "AGOTADO"]),
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
  paidAt: Date | null;
  menu: { name: string; imageUrl?: string | null };
  deliveredBy?: { name: string } | null;
  paidBy?: { name: string } | null;
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
    paidAt: o.paidAt,
    createdAt: o.createdAt,
    deliveredByName: o.deliveredBy?.name ?? null,
    paidByName: o.paidBy?.name ?? null,
  };
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      menu: { select: { name: true, imageUrl: true } },
      deliveredBy: { select: { name: true } },
      paidBy: { select: { name: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  return NextResponse.json(serializeOrder(order));
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (!session?.user) {
    if (parsed.data.status !== "CANCELADO" || order.status !== OrderStatus.PENDIENTE) {
      return NextResponse.json({ error: "No permitido" }, { status: 403 });
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: OrderStatus.CANCELADO,
        cancelledAt: new Date(),
        paidAt: null,
        paidById: null,
      },
      include: {
        menu: { select: { name: true, imageUrl: true } },
        deliveredBy: { select: { name: true } },
        paidBy: { select: { name: true } },
      },
    });
    return NextResponse.json(serializeOrder(updated));
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
        paidBy: { select: { name: true } },
      },
    });
    return NextResponse.json(serializeOrder(updated));
  }

  if (parsed.data.status === "CANCELADO" || parsed.data.status === "AGOTADO") {
    if (order.status !== OrderStatus.PENDIENTE) {
      return NextResponse.json({ error: "Solo se pueden anular pedidos pendientes" }, { status: 400 });
    }
    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: parsed.data.status,
        cancelledAt: new Date(),
        deliveredAt: null,
        deliveredById: null,
        paidAt: null,
        paidById: null,
      },
      include: {
        menu: { select: { name: true, imageUrl: true } },
        deliveredBy: { select: { name: true } },
        paidBy: { select: { name: true } },
      },
    });
    return NextResponse.json(serializeOrder(updated));
  }

  if (
    order.status !== OrderStatus.ENTREGADO &&
    order.status !== OrderStatus.CANCELADO &&
    order.status !== OrderStatus.AGOTADO
  ) {
    return NextResponse.json({ error: "Solo se pueden revertir pedidos cerrados" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      status: OrderStatus.PENDIENTE,
      deliveredAt: null,
      deliveredById: null,
      cancelledAt: null,
      paidAt: null,
      paidById: null,
    },
    include: {
      menu: { select: { name: true, imageUrl: true } },
      deliveredBy: { select: { name: true } },
      paidBy: { select: { name: true } },
    },
  });
  return NextResponse.json(serializeOrder(updated));
}
