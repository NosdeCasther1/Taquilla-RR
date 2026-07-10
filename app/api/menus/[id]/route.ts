import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { setOperationOpen } from "@/lib/operation";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  price: z.coerce.number().positive().optional(),
  active: z.boolean().optional(),
  imageUrl: z
    .string()
    .nullish()
    .refine(
      (v) =>
        v === null ||
        v === undefined ||
        v.startsWith("data:image/") ||
        v.startsWith("https://") ||
        v.startsWith("http://"),
      "Imagen inválida"
    ),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Requiere rol ADMIN" }, { status: 403 });
  }
  return null;
}

/** PATCH /api/menus/[id] — editar nombre, precio o estado. Solo ADMIN.
 *  Los pedidos existentes no cambian: guardan su propio snapshot de precio. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const menu = await prisma.menu.findUnique({ where: { id: params.id } });
  if (!menu) {
    return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
  }

  if (parsed.data.name && parsed.data.name !== menu.name) {
    const duplicate = await prisma.menu.findFirst({
      where: { name: parsed.data.name, id: { not: params.id } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Ya existe un menú con ese nombre" }, { status: 409 });
    }
  }

  try {
    const updated = await prisma.menu.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        imageUrl:
          parsed.data.imageUrl === undefined ? undefined : parsed.data.imageUrl || null,
      },
    });

    if (parsed.data.active === true) {
      await setOperationOpen(true);
    }

    if (parsed.data.active === false) {
      const activeMenus = await prisma.menu.count({ where: { active: true } });
      if (activeMenus === 0) {
        await setOperationOpen(false);
      }
    }

    return NextResponse.json({ ...updated, price: Number(updated.price) });
  } catch (e) {
    console.error("PATCH /api/menus/[id]", e);
    return NextResponse.json(
      { error: "Error al guardar. Si cambiaste la imagen, prueba con una más pequeña." },
      { status: 500 }
    );
  }
}

/** DELETE /api/menus/[id] — eliminar menú. Solo ADMIN.
 *  Si el menú ya tiene pedidos, se bloquea (hay que desactivarlo en su lugar). */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const ordersCount = await prisma.order.count({ where: { menuId: params.id } });
  if (ordersCount > 0) {
    return NextResponse.json(
      { error: "El menú tiene pedidos registrados; desactívalo en lugar de eliminarlo" },
      { status: 409 }
    );
  }

  await prisma.menu.delete({ where: { id: params.id } });

  const activeMenus = await prisma.menu.count({ where: { active: true } });
  if (activeMenus === 0) {
    await setOperationOpen(false);
  }

  return NextResponse.json({ ok: true });
}
