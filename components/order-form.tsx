"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MenuImage } from "@/components/menu-image";
import { cn, formatQ } from "@/lib/utils";

export type MenuOption = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
};

export type OrderFormValues = {
  menuId: string;
  customerName: string;
  row: string;
  grupo: number;
  notes: string;
};

export type OrderFormSuccess = OrderFormValues & {
  id: string;
  menuName: string;
  price: number;
};

type OrderFormProps = {
  title: string;
  submitLabel: string;
  showInlineSuccess?: boolean;
  onSubmitted?: (data: OrderFormSuccess) => void;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function OrderForm({
  title,
  submitLabel,
  showInlineSuccess = false,
  onSubmitted,
}: OrderFormProps) {
  const { data: menus, isLoading } = useSWR<MenuOption[]>("/api/menus?active=1", fetcher);

  const [menuId, setMenuId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [row, setRow] = useState("");
  const [grupo, setGrupo] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedMenu = menus?.find((m) => m.id === menuId);
  const grupoNum = Number(grupo);
  const isFormValid =
    !!menuId &&
    customerName.trim().length > 0 &&
    row.trim().length > 0 &&
    grupo.trim().length > 0 &&
    Number.isInteger(grupoNum) &&
    grupoNum > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!menuId) {
      setError("Selecciona un menú");
      return;
    }
    if (!customerName.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (!row.trim()) {
      setError("La fila es obligatoria");
      return;
    }
    if (!grupo.trim() || !Number.isInteger(grupoNum) || grupoNum < 1) {
      setError("El grupo es obligatorio y debe ser un número mayor a 0");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuId,
        customerName: customerName.trim(),
        row: row.trim(),
        grupo: grupoNum,
        notes: notes.trim() || undefined,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "No se pudo enviar el pedido");
      return;
    }

    const body = await res.json();
    const payload: OrderFormSuccess = {
      id: body.id,
      menuId,
      customerName: customerName.trim(),
      row: row.trim(),
      grupo: grupoNum,
      notes: notes.trim(),
      menuName: selectedMenu?.name ?? body.menuName ?? "",
      price: selectedMenu?.price ?? body.price ?? 0,
    };

    if (showInlineSuccess) {
      setSuccess(
        `Pedido de ${customerName} (fila ${row}, grupo ${grupoNum}) registrado por ${formatQ(selectedMenu?.price ?? 0)}.`
      );
    }

    onSubmitted?.(payload);

    setMenuId("");
    setCustomerName("");
    setRow("");
    setGrupo("");
    setNotes("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>
              Elige tu menú <span className="text-destructive">*</span>
            </Label>
            {isLoading && (
              <p className="py-4 text-center text-sm text-muted-foreground">Cargando menús…</p>
            )}
            {!isLoading && menus?.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay menús disponibles.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {menus?.map((menu) => {
                const selected = menuId === menu.id;
                return (
                  <button
                    key={menu.id}
                    type="button"
                    onClick={() => setMenuId(menu.id)}
                    className={cn(
                      "relative overflow-hidden rounded-xl border bg-card text-left transition-all",
                      selected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <MenuImage
                      src={menu.imageUrl}
                      alt={menu.name}
                      className="aspect-[4/3] w-full"
                    />
                    {selected && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div className="space-y-0.5 p-2.5">
                      <p className="line-clamp-1 text-sm font-semibold">{menu.name}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{menu.description}</p>
                      <p className="text-sm font-bold text-primary">{formatQ(menu.price)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">
              Tu nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej. María López"
              required
              autoComplete="name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="row">
                Fila <span className="text-destructive">*</span>
              </Label>
              <Input
                id="row"
                value={row}
                onChange={(e) => setRow(e.target.value)}
                placeholder="Ej. C"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grupo">
                Grupo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="grupo"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                placeholder="Ej. 3"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. sin jalapeños, gaseosa de naranja…"
              rows={2}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="flex items-start gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {success}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={saving || !isFormValid}
          >
            {saving ? "Enviando…" : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
