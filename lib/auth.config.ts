import type { NextAuthConfig } from "next-auth";

/**
 * Configuración base de Auth.js, sin Prisma ni bcrypt,
 * para que pueda ejecutarse en el Edge Runtime del middleware.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname, searchParams } = request.nextUrl;
      const method = request.method;
      const isLoggedIn = !!auth?.user;

      // --- Rutas públicas (asistentes sin cuenta) ---
      if (pathname.startsWith("/ordenar")) {
        return true;
      }

      // Recibo del cliente: /pedido/[id] (no confundir con /pedido del staff)
      if (/^\/pedido\/[^/]+$/.test(pathname)) {
        return true;
      }

      // Historial del cliente en este dispositivo
      if (pathname.startsWith("/mis-pedidos")) {
        return true;
      }

      // Menús activos para el formulario público
      if (pathname === "/api/menus" && method === "GET" && searchParams.get("active") === "1") {
        return true;
      }

      // Crear pedido desde /ordenar
      if (pathname === "/api/orders" && method === "POST") {
        return true;
      }

      // Ver y anular pedido propio desde /pedido/[id]
      if (/^\/api\/orders\/[^/]+$/.test(pathname) && (method === "GET" || method === "PATCH")) {
        return true;
      }

      // Historial del cliente (IDs guardados en su dispositivo)
      if (pathname === "/api/orders/mine" && method === "GET") {
        return true;
      }

      // --- Login ---
      if (pathname.startsWith("/login")) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/pedidos", request.nextUrl));
        }
        return true;
      }

      // --- Todo lo demás requiere sesión de staff ---
      if (!isLoggedIn) {
        return false;
      }

      if (pathname.startsWith("/admin") && auth.user.role !== "ADMIN") {
        return Response.redirect(new URL("/pedidos", request.nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "STAFF" | "ADMIN";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
