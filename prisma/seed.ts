import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Idempotente: se puede correr varias veces sin duplicar datos.
  const adminEmail = "admin@taquilla.local";
  // "" en .env no debe contar como contraseña definida (?? solo cubre null/undefined).
  const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim() || "admin123";
  const password = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.staffUser.upsert({
    where: { email: adminEmail },
    update: {
      // Si el seed se vuelve a correr, alinea la contraseña con SEED_ADMIN_PASSWORD / default.
      password,
      role: "ADMIN",
    },
    create: {
      email: adminEmail,
      name: "Administrador",
      password,
      role: "ADMIN",
    },
  });

  const menus = [
    {
      name: "Combo Palomero",
      description: "Palomitas grandes + gaseosa",
      price: 15,
    },
    {
      name: "Combo Nachero",
      description: "Nachos con queso + gaseosa",
      price: 20,
    },
    {
      name: "Combo Familiar",
      description: "2 palomitas grandes + nachos + 2 gaseosas",
      price: 25,
    },
  ];

  // El nombre del menú no es único en el schema, así que la idempotencia
  // se resuelve buscando por nombre antes de crear.
  for (const menu of menus) {
    const exists = await prisma.menu.findFirst({ where: { name: menu.name } });
    if (!exists) {
      await prisma.menu.create({ data: menu });
    }
  }

  console.log(`Seed listo. Usuario admin: "${admin.email}" (rol ${admin.role}).`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log('Contraseña por defecto: "admin123" — cámbiala en producción con SEED_ADMIN_PASSWORD.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
