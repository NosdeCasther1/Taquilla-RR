import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/resumen — totales (excluye cancelados de ventas). */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const notCancelled = { status: { not: OrderStatus.CANCELADO } };

  const [totals, byStatus, byMenu] = await Promise.all([
    prisma.order.aggregate({
      where: notCancelled,
      _count: { id: true },
      _sum: { price: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
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

  // El nombre del menú ya no se guarda en el pedido: se resuelve por relación.
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
      menuName: menuName.get(m.menuId) ?? "(menú eliminado)",
      count: m._count.id,
      total: Number(m._sum.price ?? 0),
    })),
  });
}
