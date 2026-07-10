import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OrdersRegistry } from "./orders-registry";

export default async function AdminPedidosPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/pedidos");
  }

  return <OrdersRegistry />;
}
