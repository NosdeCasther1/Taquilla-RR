import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UsersManager } from "./users-manager";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/pedidos");
  }

  return <UsersManager currentUserId={session.user.id} currentUserRole={session.user.role} />;
}
