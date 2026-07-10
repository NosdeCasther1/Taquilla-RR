import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Usa solo la config edge-safe (sin Prisma). La lógica de qué rutas
// requieren sesión vive en el callback `authorized` de auth.config.ts.
export default NextAuth(authConfig).auth;

export const config = {
  // Protege todo excepto los endpoints de auth, estáticos e imágenes.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
