import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDateRangeFromRequest } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let createdAt: ReturnType<typeof getDateRangeFromRequest>;
  try {
    createdAt = getDateRangeFromRequest(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fecha invalida";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const dateFilter = createdAt ? { createdAt } : {};
  const notCancelled = { ...dateFilter, status: { not: OrderStatus.CANCELADO } };

  const [totals, byStatus, byMenu] = await Promise.all([
    prisma.order.aggregate({
      where: notCancelled,
      _count: { id: true },
      _sum: { price: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: dateFilter,
      _count: { id: true },
    }),
    prisma.order.groupBy({
      by: ["menuId"],
      where: notCancelled,
      _count: { id: true },
      _sum: { price: true },
      orderBy: { _sum: { price: "desc" } },
    }),
  ]);

  const menus = await prisma.menu.findMany({
    where: { id: { in: byMenu.map((m) => m.menuId) } },
    select: { id: true, name: true },
  });
  const menuName = new Map(menus.map((m) => [m.id, m.name]));

  const statusCount = (status: "PENDIENTE" | "ENTREGADO" | "CANCELADO") =>
    byStatus.find((s) => s.status === status)?._count.id ?? 0;

  return NextResponse.json({
    totalOrders: totals._count.id,
    totalSales: Number(totals._sum.price ?? 0),
    pending: statusCount("PENDIENTE"),
    delivered: statusCount("ENTREGADO"),
    cancelled: statusCount("CANCELADO"),
    byMenu: byMenu.map((m) => ({
      menuName: menuName.get(m.menuId) ?? "(menu eliminado)",
      count: m._count.id,
      total: Number(m._sum.price ?? 0),
    })),
  });
}
