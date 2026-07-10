"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, History, Popcorn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderForm, type OrderFormSuccess } from "@/components/order-form";
import { getLastOrderId, saveOrderToHistory } from "@/lib/order-storage";

export default function OrdenarPage() {
  const router = useRouter();
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  useEffect(() => {
    setLastOrderId(getLastOrderId());
  }, []);

  function handleSubmitted(data: OrderFormSuccess) {
    [...data.ids].reverse().forEach((id) => saveOrderToHistory(id));
    router.push(data.ids.length === 1 ? `/pedido/${data.ids[0]}` : "/mis-pedidos");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {lastOrderId && (
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/pedido/${lastOrderId}`}>
              <Eye className="h-4 w-4" />
              Ver mi pedido
            </Link>
          </Button>
        )}
        <Button variant="outline" className={lastOrderId ? "w-full" : "col-span-2 w-full"} asChild>
          <Link href="/mis-pedidos">
            <History className="h-4 w-4" />
            Mis pedidos
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
        <Popcorn className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-medium">Noche de Cine</p>
          <p className="text-sm text-muted-foreground">
            Ordena desde tu asiento. No necesitas cuenta ni levantarte.
          </p>
        </div>
      </div>
      <OrderForm title="Tu pedido" submitLabel="Enviar pedido" onSubmitted={handleSubmitted} />
    </div>
  );
}
