"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  error?: string | null;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export function ActionDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  busyLabel = "Procesando...",
  busy = false,
  error,
  variant = "default",
  onConfirm,
  onOpenChange,
}: ActionDialogProps) {
  if (!open) return null;

  const destructive = variant === "destructive";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Cerrar"
        onClick={() => !busy && onOpenChange(false)}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
        aria-describedby="action-dialog-description"
        className="relative w-full max-w-sm rounded-lg border bg-card p-4 text-card-foreground shadow-xl sm:max-w-md"
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Cerrar"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-3 pr-6">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
              destructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="action-dialog-title" className="text-base font-semibold">
              {title}
            </h2>
            <p id="action-dialog-description" className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
