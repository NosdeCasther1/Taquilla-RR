"use client";

import { OrderForm } from "@/components/order-form";

/** Respaldo para staff: captura manual si alguien no puede usar /ordenar. */
export default function NuevoPedidoPage() {
  return (
    <OrderForm
      title="Nuevo pedido (manual)"
      submitLabel="Crear pedido"
      showInlineSuccess
    />
  );
}
