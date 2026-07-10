import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MenusManager } from "./menus-manager";

export default async function AdminMenusPage() {
  const session = await auth();
  // El middleware ya redirige a quien no sea ADMIN; esto es defensa adicional.
  if (session?.user.role !== "ADMIN") {
    redirect("/pedidos");
  }

  return <MenusManager />;
}
