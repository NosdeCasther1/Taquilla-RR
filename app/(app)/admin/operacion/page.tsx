import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OperationManager } from "./operation-manager";

export default async function AdminOperacionPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/pedidos");
  }

  return <OperationManager />;
}
