"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MenuImage } from "@/components/menu-image";
import { fileToDataUrl } from "@/lib/image";
import { formatQ } from "@/lib/utils";

type Menu = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  active: boolean;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MenusManager() {
  const { data: menus, isLoading, mutate } = useSWR<Menu[]>("/api/menus", fetcher);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const editing = editingId !== null;

  function startEdit(menu: Menu) {
    setEditingId(menu.id);
    setName(menu.name);
    setDescription(menu.description);
    setPrice(String(menu.price));
    setImageUrl(menu.imageUrl);
    setImageChanged(false);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setImageUrl(null);
    setImageChanged(false);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageUrl(dataUrl);
      setImageChanged(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la imagen");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload: Record<string, unknown> = {
      name,
      description,
      price: Number(price),
    };
    // Al editar sin cambiar imagen, no reenviar el data URL enorme.
    if (!editing || imageChanged) {
      payload.imageUrl = imageUrl;
    }

    const res = await fetch(editing ? `/api/menus/${editingId}` : "/api/menus", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      if (res.status === 413) {
        setError("La imagen es demasiado grande. Prueba con una foto más pequeña.");
        return;
      }
      setError(body?.error ?? `No se pudo guardar el menú (${res.status})`);
      return;
    }

    cancelEdit();
    mutate();
  }

  async function toggleActive(menu: Menu) {
    await fetch(`/api/menus/${menu.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !menu.active }),
    });
    mutate();
  }

  async function handleDelete(menu: Menu) {
    if (!confirm(`¿Eliminar "${menu.name}"? Esta acción no se puede deshacer.`)) return;

    const res = await fetch(`/api/menus/${menu.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? "No se pudo eliminar el menú");
      return;
    }
    mutate();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar menú" : "Nuevo menú"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Imagen</Label>
              <div className="flex items-start gap-3">
                <MenuImage
                  src={imageUrl}
                  alt={name || "Vista previa"}
                  className="h-24 w-24 shrink-0 rounded-lg"
                />
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {imageUrl ? "Cambiar imagen" : "Subir imagen"}
                  </Button>
                  {imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImageUrl(null);
                        setImageChanged(true);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      Quitar imagen
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG o WEBP · se comprime automáticamente
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Combo Palomero"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Palomitas grandes + gaseosa"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio (Q)</Label>
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ej. 15"
                required
              />
              {editing && (
                <p className="text-xs text-muted-foreground">
                  Cambiar el precio no afecta pedidos ya creados: cada pedido congela su precio.
                </p>
              )}
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={saving}>
                {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {saving ? "Guardando…" : editing ? "Guardar cambios" : "Agregar menú"}
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menús</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!isLoading && menus?.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay menús todavía.</p>
          )}
          <ul className="divide-y">
            {menus?.map((menu) => (
              <li key={menu.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <MenuImage
                    src={menu.imageUrl}
                    alt={menu.name}
                    className="h-16 w-16 shrink-0 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{menu.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {menu.description} · {formatQ(menu.price)}
                        </p>
                      </div>
                      <Badge variant={menu.active ? "success" : "secondary"}>
                        {menu.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(menu)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(menu)}>
                        {menu.active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(menu)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
