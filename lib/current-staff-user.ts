import { prisma } from "@/lib/prisma";

type SessionUserLike = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

export async function findCurrentStaffUser(user: SessionUserLike) {
  const filters = [
    user.id ? { id: user.id } : null,
    user.email ? { email: user.email } : null,
    user.name ? { name: user.name } : null,
  ].filter(Boolean) as { id?: string; email?: string; name?: string }[];

  if (filters.length === 0) return null;

  return prisma.staffUser.findFirst({
    where: { OR: filters },
    select: { id: true, name: true },
  });
}
