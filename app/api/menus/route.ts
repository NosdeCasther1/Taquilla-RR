import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const menuSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  description: z.string().trim().min(1, "La descripción es requerida"),
  price: z.coerce.number().positive("El precio debe ser mayor a 0"),
  imageUrl: z
    .string()
    .nullish()
    .refine(
      (v) => !v || v.startsWith("data:image/") || v.startsWith("https://") || v.startsWith("http://"),
      "Imagen inválida"
    ),
});

/** GET /api/menus — lista menús.
 *  ?active=1 es público (formulario /ordenar). Sin active=1 requiere sesión de staff. */
export async function GET(request: Request) {
  const onlyActive = new URL(request.url).searchParams.get("active") === "1";

  if (!onlyActive) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }
  const menus = await prisma.menu.findMany({
    where: onlyActive ? { active: true } : undefined,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    menus.map((m) => ({ ...m, price: Number(m.price) }))
  );
}

/** POST /api/menus — crear menú. Solo ADMIN. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Requiere rol ADMIN" }, { status: 403 });
  }

  const parsed = menuSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // El nombre no es único a nivel de base de datos, pero evitamos duplicados obvios.
  const exists = await prisma.menu.findFirst({ where: { name: parsed.data.name } });
  if (exists) {
    return NextResponse.json({ error: "Ya existe un menú con ese nombre" }, { status: 409 });
  }

  const menu = await prisma.menu.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      imageUrl: parsed.data.imageUrl || null,
    },
  });
  return NextResponse.json({ ...menu, price: Number(menu.price) }, { status: 201 });
}
