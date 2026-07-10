const LAST_ORDER_KEY = "taquilla-rr-last-order-id";
const HISTORY_KEY = "taquilla-rr-order-ids";
const MAX_HISTORY = 50;

function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
      }
    }
    const last = localStorage.getItem(LAST_ORDER_KEY);
    return last ? [last] : [];
  } catch {
    return [];
  }
}

function writeHistory(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(ids));
}

export function saveOrderToHistory(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_ORDER_KEY, id);
  const updated = [id, ...readHistory().filter((existing) => existing !== id)].slice(0, MAX_HISTORY);
  writeHistory(updated);
}

/** @deprecated Usa saveOrderToHistory */
export function saveLastOrderId(id: string) {
  saveOrderToHistory(id);
}

export function getOrderIds(): string[] {
  return readHistory();
}

export function getLastOrderId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_ORDER_KEY);
}

export function clearLastOrderId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LAST_ORDER_KEY);
}
