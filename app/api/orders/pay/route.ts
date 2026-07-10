import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { findCurrentStaffUser } from "@/lib/current-staff-user";
import { prisma } from "@/lib/prisma";

const paySchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const currentUser = await findCurrentStaffUser(session.user);
  if (!currentUser) {
    return NextResponse.json({ error: "No se pudo identificar quien esta cobrando" }, { status: 403 });
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
      paidById: currentUser.id,
    },
  });

  return NextResponse.json({
    ok: true,
    paymentMethod: "EFECTIVO",
    paidAt,
    paidByName: currentUser.name,
    paidCount: payable.length,
    total,
  });
}
