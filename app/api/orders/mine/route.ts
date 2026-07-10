import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_IDS = 50;

/** GET /api/orders/mine?ids=id1,id2 — historial del cliente (IDs guardados en su dispositivo). */
export async function GET(request: Request) {
  const ids = Array.from(
    new Set(
      (new URL(request.url).searchParams.get("ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  );

  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: "Demasiados pedidos solicitados" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: { id: { in: ids } },
    include: {
      menu: { select: { name: true, imageUrl: true } },
    },
  });

  const byId = new Map(
    orders.map((o) => [
      o.id,
      {
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
      },
    ])
  );

  return NextResponse.json(ids.map((id) => byId.get(id)).filter(Boolean));
}
