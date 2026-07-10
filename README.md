# Taquilla RR

Sistema de comandas para el evento **Noche de Cine**. Los asistentes piden desde su celular **sin cuenta ni login**; el staff recibe alertas, prepara y entrega en la fila/grupo indicado.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma** conectado a **TiDB** (MySQL-compatible)
- **Auth.js (NextAuth v5)** con Credentials Provider — solo login de staff
- **Tailwind CSS + shadcn/ui**, diseño mobile-first
- **SWR** con polling cada 4 segundos en la cola de pedidos y el resumen

## Flujo del evento

1. **Asistentes** abren `/ordenar` en su celular (enlace o código QR en pantalla/proyección).
2. Eligen menú, escriben nombre, fila y grupo, y envían — **sin registrarse**.
3. **Staff** mantiene abierta `/pedidos` en su celular (logueado):
   - Suena un beep cuando entra un pedido nuevo.
   - Las tarjetas nuevas se resaltan hasta que las tocan o pasan ~60 s.
   - El título de la pestaña muestra `(3) Taquilla RR` con el número de pendientes.
   - Opcional: notificaciones del sistema si activan el permiso del navegador.
4. El staff marca **Entregar** al llevar el combo al asiento.

**Respaldo:** `/pedido` (solo staff) permite capturar manualmente si alguien no puede usar `/ordenar`.

## Vistas

| Ruta | Descripción | Acceso |
|---|---|---|
| `/ordenar` | Formulario público para que los asistentes pidan desde su asiento | **Público** |
| `/login` | Login de staff | Público |
| `/pedidos` | Cola con alertas, filtros y botón de entregar | Staff |
| `/pedido` | Captura manual de respaldo | Staff |
| `/resumen` | Totales y ventas por menú | Staff |
| `/admin/menus` | CRUD de menús | Solo ADMIN |

## Compartir el enlace / QR para asistentes

### En local (pruebas)

```
http://localhost:3000/ordenar
```

### En producción (Vercel)

Tras el deploy, la URL pública será:

```
https://TU-DOMINIO.vercel.app/ordenar
```

### Generar código QR

1. Copia la URL de `/ordenar` (local o producción).
2. Usa cualquier generador de QR gratuito, por ejemplo:
   - [qr-code-generator.com](https://www.qr-code-generator.com/)
   - La app **Cámara** de iPhone o **Google Lens** en Android (pega el enlace).
3. Descarga el PNG/SVG e imprímelo o muéstralo en pantalla al inicio del evento.
4. Texto sugerido para la diapositiva:

   > **¿Quieres palomitas o nachos?**  
   > Escanea el QR y pide desde tu asiento.  
   > No necesitas app ni cuenta.

### Tips para el evento

- Proyecta el QR grande antes de que empiece la película.
- El staff debe tener `/pedidos` abierto **antes** de que empiecen a llegar pedidos (así el navegador permite sonido y notificaciones tras un toque).
- Si el sonido no suena la primera vez, toca la pantalla una vez (política de autoplay del navegador).

## Desarrollo local

```bash
npm install
cp .env.example .env   # completa DATABASE_URL y AUTH_SECRET
npm run db:push
npm run db:seed
npm run dev
```

- Staff: `http://localhost:3000/login` → `admin@taquilla.local` / `admin123`
- Asistentes: `http://localhost:3000/ordenar`

## Despliegue en Vercel

1. Clúster en [TiDB Cloud](https://tidbcloud.com) con `?sslaccept=strict` en la URL.
2. Importa el repo en Vercel.
3. Variables de entorno:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | Cadena TiDB |
   | `AUTH_SECRET` | Secreto aleatorio |
   | `AUTH_URL` | `https://TU-DOMINIO.vercel.app` |

4. Deploy (`build` ejecuta `prisma db push` automáticamente).
5. Seed una vez: `npm run db:seed` con el `DATABASE_URL` de producción.
6. Comparte `https://TU-DOMINIO.vercel.app/ordenar` o su QR.

## Seguridad de rutas

| Ruta / endpoint | Acceso |
|---|---|
| `GET /ordenar` | Público |
| `POST /api/orders` | Público (crear pedido) |
| `GET /api/menus?active=1` | Público (menús para ordenar) |
| `GET /api/orders`, `PATCH /api/orders/[id]` | Solo staff |
| `/pedidos`, `/resumen`, `/admin/*`, `/pedido` | Solo staff |

## Modelo de datos

- **StaffUser**: `email`, `password` (bcrypt), rol `STAFF` / `ADMIN`.
- **Menu**: nombre, descripción, precio, `active`.
- **Order**: precio congelado al crear, datos del asistente (`customerName`, `row`, `grupo` opcional, `notes`), `status`, `deliveredAt`, `deliveredById` (staff que entregó).

## Crear más usuarios de staff

```ts
import bcrypt from "bcryptjs";
const password = await bcrypt.hash("la-contraseña", 10);
// prisma.staffUser.create({ data: { email, name, password, role: "STAFF" } })
```
