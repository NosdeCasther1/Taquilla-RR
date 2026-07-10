import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un monto en quetzales, p. ej. Q15.00 */
export function formatQ(amount: number | string) {
  return `Q${Number(amount).toFixed(2)}`;
}
