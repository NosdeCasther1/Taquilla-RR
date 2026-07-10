import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateUserSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").optional(),
  email: z
    .string()
    .trim()
    .email("Correo invalido")
    .transform((email) => email.toLowerCase())
    .optional(),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres").optional(),
  role: z.enum(["STAFF", "ADMIN"]).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Requiere rol ADMIN" }, { status: 403 }) };
  }
  return { session };
}

async function adminCount() {
  return prisma.staffUser.count({ where: { role: "ADMIN" } });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  const parsed = updateUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const user = await prisma.staffUser.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (parsed.data.email && parsed.data.email !== user.email) {
    const duplicate = await prisma.staffUser.findUnique({ where: { email: parsed.data.email } });
    if (duplicate) {
      return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 409 });
    }
  }

  if (user.role === "ADMIN" && parsed.data.role === "STAFF" && (await adminCount()) <= 1) {
    return NextResponse.json(
      { error: "Debe quedar al menos un administrador activo" },
      { status: 409 }
    );
  }

  const password = parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : undefined;
  const updated = await prisma.staffUser.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      password,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    createdAt: updated.createdAt,
    deliveredOrders: updated._count.orders,
  });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  if (params.id === gate.session.user.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 409 });
  }

  const user = await prisma.staffUser.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, _count: { select: { orders: true } } },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (user.role === "ADMIN" && (await adminCount()) <= 1) {
    return NextResponse.json(
      { error: "Debe quedar al menos un administrador activo" },
      { status: 409 }
    );
  }

  if (user._count.orders > 0) {
    return NextResponse.json(
      { error: "El usuario tiene pedidos entregados registrados y no se puede eliminar" },
      { status: 409 }
    );
  }

  await prisma.staffUser.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
