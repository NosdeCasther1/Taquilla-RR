import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const paySchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1).max(100),
});

function accountKey(order: { customerName: string; row: string; grupo: number }) {
  return `${order.customerName.trim().toLowerCase()}|${order.row.trim().toLowerCase()}|${order.grupo}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = paySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Selecciona al menos un pedido para cobrar" }, { status: 400 });
  }

  const orderIds = Array.from(new Set(parsed.data.orderIds));
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: {
      id: true,
      customerName: true,
      row: true,
      grupo: true,
      price: true,
      status: true,
      paidAt: true,
    },
  });

  if (orders.length === 0) {
    return NextResponse.json({ error: "No se encontraron pedidos para cobrar" }, { status: 404 });
  }

  const keys = new Set(orders.map(accountKey));
  if (keys.size > 1) {
    return NextResponse.json(
      { error: "Solo se puede cobrar una cuenta por hermano a la vez" },
      { status: 400 }
    );
  }

  const payable = orders.filter(
    (order) =>
      order.status !== OrderStatus.CANCELADO &&
      order.status !== OrderStatus.AGOTADO &&
      !order.paidAt
  );

  if (payable.length === 0) {
    return NextResponse.json({ error: "Esta cuenta ya no tiene saldo pendiente" }, { status: 400 });
  }

  const paidAt = new Date();
  const paidIds = payable.map((order) => order.id);
  const total = payable.reduce((sum, order) => sum + Number(order.price), 0);

  await prisma.order.updateMany({
    where: { id: { in: paidIds }, paidAt: null },
    data: {
      paidAt,
      paidById: session.user.id,
    },
  });

  return NextResponse.json({
    ok: true,
    paymentMethod: "EFECTIVO",
    paidAt,
    paidByName: session.user.name ?? "Usuario",
    paidCount: payable.length,
    total,
  });
}
