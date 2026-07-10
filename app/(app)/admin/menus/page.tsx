import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MenusManager } from "./menus-manager";

export default async function AdminMenusPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/pedidos");
  }

  return <MenusManager />;
}
