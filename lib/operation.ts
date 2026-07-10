import { prisma } from "@/lib/prisma";

export const OPERATION_OPEN_KEY = "operation.open";

export async function getOperationStatus() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: OPERATION_OPEN_KEY },
  });

  return {
    open: setting?.value === "1",
    updatedAt: setting?.updatedAt ?? null,
  };
}

export async function setOperationOpen(open: boolean) {
  return prisma.systemSetting.upsert({
    where: { key: OPERATION_OPEN_KEY },
    update: { value: open ? "1" : "0" },
    create: { key: OPERATION_OPEN_KEY, value: open ? "1" : "0" },
  });
}
