import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createUserSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  email: z.string().trim().email("Correo invalido").transform((email) => email.toLowerCase()),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
  role: z.enum(["STAFF", "ADMIN"]),
});

async function requireStaff() {
  const session = await auth();
  if (!session?.user) {
    return { response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  return { session };
}

async function requireAdmin() {
  const gate = await requireStaff();
  if ("response" in gate) return gate;

  const { session } = gate;
  if (session.user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Requiere rol ADMIN" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const gate = await requireStaff();
  if ("response" in gate) return gate.response;

  const users = await prisma.staffUser.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  return NextResponse.json(
    users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      deliveredOrders: user._count.orders,
    }))
  );
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  const parsed = createUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const exists = await prisma.staffUser.findUnique({ where: { email: parsed.data.email } });
  if (exists) {
    return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 409 });
  }

  const password = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.staffUser.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password,
      role: parsed.data.role,
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

  return NextResponse.json(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      deliveredOrders: user._count.orders,
    },
    { status: 201 }
  );
}
