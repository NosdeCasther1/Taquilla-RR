"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil, Plus, ShieldCheck, Trash2, UserCog, X } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = "STAFF" | "ADMIN";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  deliveredOrders: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function UsersManager({
  currentUserId,
  currentUserRole,
}: {
  currentUserId: string;
  currentUserRole: Role;
}) {
  const { data: users, isLoading, mutate } = useSWR<StaffUser[]>("/api/users", fetcher);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STAFF");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const editing = editingId !== null;
  const canManageUsers = currentUserRole === "ADMIN";

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setRole("STAFF");
    setEditingId(null);
    setError(null);
  }

  function startEdit(user: StaffUser) {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setRole(user.role);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload: Record<string, unknown> = { name, email, role };
    if (!editing || password.trim()) {
      payload.password = password;
    }

    const res = await fetch(editing ? `/api/users/${editingId}` : "/api/users", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? `No se pudo guardar el usuario (${res.status})`);
      return;
    }

    resetForm();
    mutate();
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setDeleteError(body?.error ?? "No se pudo eliminar el usuario");
      return;
    }

    setDeleteTarget(null);
    mutate();
  }

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[380px_1fr] lg:gap-4 lg:space-y-0">
      {canManageUsers && (
        <Card className="lg:self-start">
          <CardHeader>
            <CardTitle>{editing ? "Editar usuario" : "Nuevo usuario"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Ana Perez"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@taquilla.local"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {editing ? "Nueva contrasena" : "Contrasena"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editing ? "Dejar en blanco para no cambiar" : "Minimo 6 caracteres"}
                  required={!editing}
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={role} onValueChange={(value: Role) => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Agregar usuario"}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className={canManageUsers ? undefined : "lg:col-span-2"}>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {!isLoading && users?.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay usuarios todavia.</p>
          )}
          <ul className="divide-y">
            {users?.map((user) => {
              const isCurrent = user.id === currentUserId;
              return (
                <li key={user.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {user.role === "ADMIN" ? (
                          <ShieldCheck className="h-5 w-5" />
                        ) : (
                          <UserCog className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{user.name}</p>
                          {isCurrent && <Badge variant="secondary">Tu cuenta</Badge>}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.deliveredOrders} pedidos entregados
                        </p>
                      </div>
                    </div>
                    <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                      {user.role === "ADMIN" ? "Admin" : "Staff"}
                    </Badge>
                  </div>
                  {canManageUsers && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(user)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteTarget(user);
                          setDeleteError(null);
                        }}
                        disabled={isCurrent}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <ActionDialog
        open={!!deleteTarget}
        title="Eliminar usuario"
        description={
          deleteTarget
            ? `Se eliminara "${deleteTarget.name}". Esta accion no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        busyLabel="Eliminando..."
        busy={deleting}
        error={deleteError}
        variant="destructive"
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
