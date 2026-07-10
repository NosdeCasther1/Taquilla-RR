import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getDateRangeFromRequest } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

const orderSchema = z.object({
  menuId: z.string().min(1, "Selecciona un menú"),
  customerName: z.string().trim().min(1, "El nombre es requerido"),
  row: z.string().trim().min(1, "La fila es requerida"),
  grupo: z.coerce
    .number({ error: "El grupo es obligatorio" })
    .int("El grupo debe ser un número entero")
    .positive("El grupo debe ser mayor a 0"),
  notes: z.string().trim().max(500).optional(),
});

/** GET /api/orders — cola de pedidos (solo staff). */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const status = new URL(request.url).searchParams.get("status");
  let createdAt: ReturnType<typeof getDateRangeFromRequest>;
  try {
    createdAt = getDateRangeFromRequest(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fecha invalida";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const where = {
    ...(status === OrderStatus.PENDIENTE ||
    status === OrderStatus.ENTREGADO ||
    status === OrderStatus.CANCELADO
      ? { status }
      : {}),
    ...(createdAt ? { createdAt } : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      menu: { select: { name: true } },
      deliveredBy: { select: { name: true } },
    },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      menuName: o.menu.name,
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
    }))
  );
}

/** POST /api/orders — crear pedido (público desde /ordenar o staff desde /pedido). */
export async function POST(request: Request) {
  const session = await auth();

  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const menu = await prisma.menu.findUnique({ where: { id: parsed.data.menuId } });
  if (!menu || !menu.active) {
    return NextResponse.json({ error: "El menú no existe o está inactivo" }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      menuId: menu.id,
      price: menu.price,
      customerName: parsed.data.customerName,
      row: parsed.data.row,
      grupo: parsed.data.grupo,
      notes: parsed.data.notes || null,
      // deliveredById se asigna al marcar ENTREGADO, no al crear el pedido.
      deliveredById: null,
    },
  });

  return NextResponse.json(
    {
      ...order,
      price: Number(order.price),
      menuName: menu.name,
      createdByStaff: !!session?.user,
    },
    { status: 201 }
  );
}
