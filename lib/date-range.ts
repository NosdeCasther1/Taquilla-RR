const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const GUATEMALA_OFFSET = "-06:00";

function parseDateOnly(value: string, boundary: "start" | "end") {
  if (!DATE_ONLY.test(value)) {
    throw new Error("Fecha invalida");
  }

  const date = new Date(`${value}T00:00:00.000${GUATEMALA_OFFSET}`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Fecha invalida");
  }

  if (boundary === "end") {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
}

export function getDateRangeFromRequest(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get("from")?.trim();
  const to = params.get("to")?.trim();

  if (!from && !to) return undefined;

  const range: { gte?: Date; lt?: Date } = {};
  if (from) range.gte = parseDateOnly(from, "start");
  if (to) range.lt = parseDateOnly(to, "end");

  if (range.gte && range.lt && range.gte >= range.lt) {
    throw new Error("El rango de fechas no es valido");
  }

  return range;
}
