"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Check, CheckCircle2, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MenuImage } from "@/components/menu-image";
import { cn, formatQ } from "@/lib/utils";

export type MenuOption = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
};

export type OrderFormSuccess = {
  ids: string[];
  orders: {
    id: string;
    menuId: string;
    menuName: string;
    price: number;
  }[];
  totalPrice: number;
  customerName: string;
  row: string;
  grupo: number;
  notes: string;
};

type OrderFormProps = {
  title: string;
  submitLabel: string;
  showInlineSuccess?: boolean;
  onSubmitted?: (data: OrderFormSuccess) => void;
};

type OperationStatus = {
  open: boolean;
  activeMenus: number;
  pendingOrders: number;
  updatedAt: string | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function OrderForm({
  title,
  submitLabel,
  showInlineSuccess = false,
  onSubmitted,
}: OrderFormProps) {
  const { data: menus, isLoading } = useSWR<MenuOption[]>("/api/menus?active=1", fetcher);
  const { data: operation } = useSWR<OperationStatus>("/api/operation", fetcher, {
    refreshInterval: 8000,
  });

  const [menuIds, setMenuIds] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [row, setRow] = useState("");
  const [grupo, setGrupo] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedMenus = useMemo(
    () => menuIds.map((id) => menus?.find((menu) => menu.id === id)).filter(Boolean) as MenuOption[],
    [menuIds, menus]
  );
  const totalPrice = selectedMenus.reduce((sum, menu) => sum + menu.price, 0);
  const grupoNum = Number(grupo);
  const isFormValid =
    operation?.open === true &&
    menuIds.length > 0 &&
    customerName.trim().length > 0 &&
    row.trim().length > 0 &&
    grupo.trim().length > 0 &&
    Number.isInteger(grupoNum) &&
    grupoNum > 0;

  function toggleMenu(id: string) {
    setMenuIds((current) =>
      current.includes(id) ? current.filter((menuId) => menuId !== id) : [...current, id]
    );
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!operation?.open) {
      setError("La taquilla esta cerrada. No se estan recibiendo pedidos.");
      return;
    }

    if (menuIds.length === 0) {
      setError("Selecciona al menos un combo");
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
      setError("El grupo es obligatorio y debe ser un numero mayor a 0");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuIds,
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
    const orders = (body.orders ?? []).map(
      (order: { id: string; menuId: string; menuName: string; price: number }) => ({
        id: order.id,
        menuId: order.menuId,
        menuName: order.menuName,
        price: order.price,
      })
    );
    const payload: OrderFormSuccess = {
      ids: body.ids ?? orders.map((order: { id: string }) => order.id),
      orders,
      totalPrice: body.totalPrice ?? totalPrice,
      customerName: customerName.trim(),
      row: row.trim(),
      grupo: grupoNum,
      notes: notes.trim(),
    };

    if (showInlineSuccess) {
      setSuccess(
        `${payload.ids.length} ${payload.ids.length === 1 ? "pedido registrado" : "pedidos registrados"} por ${formatQ(payload.totalPrice)}.`
      );
    }

    onSubmitted?.(payload);

    setMenuIds([]);
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
          {operation?.open === false && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
              <Lock className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Taquilla cerrada</p>
                <p className="text-sm">
                  En este momento no se estan recibiendo pedidos nuevos.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Elige tus combos <span className="text-destructive">*</span>
            </Label>
            {isLoading && (
              <p className="py-4 text-center text-sm text-muted-foreground">Cargando menus...</p>
            )}
            {!isLoading && menus?.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay menus disponibles.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {menus?.map((menu) => {
                const selected = menuIds.includes(menu.id);
                return (
                  <button
                    key={menu.id}
                    type="button"
                    onClick={() => toggleMenu(menu.id)}
                    disabled={operation?.open === false}
                    className={cn(
                      "relative overflow-hidden rounded-xl border bg-card text-left transition-all",
                      operation?.open === false && "cursor-not-allowed opacity-60",
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

          {selectedMenus.length > 0 && (
            <div className="space-y-2 rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Seleccionados</p>
                <p className="text-sm font-bold text-primary">{formatQ(totalPrice)}</p>
              </div>
              <ul className="space-y-2">
                {selectedMenus.map((menu) => (
                  <li key={menu.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{menu.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground"
                      onClick={() => toggleMenu(menu.id)}
                      disabled={operation?.open === false}
                    >
                      <X className="h-4 w-4" />
                      Quitar
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="customerName">
              Tu nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej. Maria Lopez"
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
              placeholder="Ej. sin jalapenos, gaseosa de naranja..."
              rows={2}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="flex items-start gap-2 rounded-md bg-green-900/30 px-3 py-2 text-sm text-green-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {success}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={saving || !isFormValid}>
            {operation?.open === false
              ? "Taquilla cerrada"
              : saving
              ? "Enviando..."
              : menuIds.length > 1
                ? `${submitLabel} (${menuIds.length})`
                : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
