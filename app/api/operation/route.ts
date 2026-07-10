import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getOperationStatus, setOperationOpen } from "@/lib/operation";
import { prisma } from "@/lib/prisma";

const operationSchema = z.object({
  open: z.boolean(),
});

export async function GET() {
  const [operation, activeMenus, pendingOrders] = await Promise.all([
    getOperationStatus(),
    prisma.menu.count({ where: { active: true } }),
    prisma.order.count({ where: { status: OrderStatus.PENDIENTE } }),
  ]);

  return NextResponse.json({
    ...operation,
    activeMenus,
    pendingOrders,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Requiere rol ADMIN" }, { status: 403 });
  }

  const parsed = operationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
  }

  const setting = await setOperationOpen(parsed.data.open);
  return NextResponse.json({
    open: setting.value === "1",
    updatedAt: setting.updatedAt,
  });
}
