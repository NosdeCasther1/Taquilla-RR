import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getDateRangeFromRequest } from "@/lib/date-range";
import { getOperationStatus } from "@/lib/operation";
import { prisma } from "@/lib/prisma";

const orderSchema = z
  .object({
    menuId: z.string().min(1, "Selecciona un menu").optional(),
    menuIds: z.array(z.string().min(1)).min(1, "Selecciona al menos un menu").optional(),
    customerName: z.string().trim().min(1, "El nombre es requerido"),
    row: z.string().trim().min(1, "La fila es requerida"),
    grupo: z.coerce
      .number({ error: "El grupo es obligatorio" })
      .int("El grupo debe ser un numero entero")
      .positive("El grupo debe ser mayor a 0"),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.menuId || data.menuIds?.length, {
    message: "Selecciona al menos un menu",
    path: ["menuIds"],
  });

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
    status === OrderStatus.CANCELADO ||
    status === OrderStatus.AGOTADO
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
      paidBy: { select: { name: true } },
    },
  }).catch((error) => {
    console.error("GET /api/orders", error);
    return null;
  });

  if (!orders) {
    return NextResponse.json(
      { error: "No se pudo conectar con la base de datos. Revisa la configuracion de produccion." },
      { status: 503 }
    );
  }

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
      paidAt: o.paidAt,
      createdAt: o.createdAt,
      deliveredByName: o.deliveredBy?.name ?? null,
      paidByName: o.paidBy?.name ?? null,
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  const operation = await getOperationStatus();

  if (!operation.open) {
    return NextResponse.json(
      { error: "La taquilla esta cerrada. No se estan recibiendo pedidos." },
      { status: 403 }
    );
  }

  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const menuIds = Array.from(
    new Set(parsed.data.menuIds ?? (parsed.data.menuId ? [parsed.data.menuId] : []))
  );
  const menus = await prisma.menu.findMany({ where: { id: { in: menuIds } } });
  const menuById = new Map(menus.map((menu) => [menu.id, menu]));
  const selectedMenus = menuIds.map((id) => menuById.get(id));

  if (selectedMenus.some((menu) => !menu || !menu.active)) {
    return NextResponse.json(
      { error: "Uno de los menus no existe o esta inactivo" },
      { status: 400 }
    );
  }

  const orders = await prisma.$transaction(
    selectedMenus.map((menu) =>
      prisma.order.create({
        data: {
          menuId: menu!.id,
          price: menu!.price,
          customerName: parsed.data.customerName,
          row: parsed.data.row,
          grupo: parsed.data.grupo,
          notes: parsed.data.notes || null,
          deliveredById: null,
        },
      })
    )
  );

  const serialized = orders.map((order, index) => ({
    ...order,
    price: Number(order.price),
    menuName: selectedMenus[index]!.name,
  }));
  const first = serialized[0];

  return NextResponse.json(
    {
      ...first,
      orders: serialized,
      ids: serialized.map((order) => order.id),
      totalPrice: serialized.reduce((sum, order) => sum + order.price, 0),
      createdByStaff: !!session?.user,
    },
    { status: 201 }
  );
}
