/** Beep corto con Web Audio API (sin archivo externo). */
export function playNewOrderSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {
    // Ignorar si el navegador bloquea audio sin interacción previa.
  }
}

export function notifyNewOrder(customerName: string, row: string, grupo: number) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }
  new Notification("Nuevo pedido — Taquilla RR", {
    body: `${customerName} · fila ${row}, grupo ${grupo}`,
    tag: `order-${Date.now()}`,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}
