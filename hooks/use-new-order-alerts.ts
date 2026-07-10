"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notifyNewOrder, playNewOrderSound } from "@/lib/notifications";

type OrderAlert = {
  id: string;
  customerName: string;
  row: string;
  grupo: number;
  status: "PENDIENTE" | "ENTREGADO" | "CANCELADO" | "AGOTADO";
};

const BASE_TITLE = "Taquilla RR";
const UNSEEN_TTL_MS = 60_000;

export function useNewOrderAlerts(orders: OrderAlert[] | undefined, pendingCount: number) {
  const knownPendingRef = useRef<Set<string> | null>(null);
  const [unseenIds, setUnseenIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const markSeen = useCallback((orderId: string) => {
    setUnseenIds((prev) => {
      if (!prev.has(orderId)) return prev;
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
    const timer = timersRef.current.get(orderId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(orderId);
    }
  }, []);

  const markUnseen = useCallback((orderId: string) => {
    setUnseenIds((prev) => new Set(prev).add(orderId));
    const existing = timersRef.current.get(orderId);
    if (existing) clearTimeout(existing);
    timersRef.current.set(
      orderId,
      setTimeout(() => markSeen(orderId), UNSEEN_TTL_MS)
    );
  }, [markSeen]);

  // Título de pestaña con conteo de pendientes
  useEffect(() => {
    document.title = pendingCount > 0 ? `(${pendingCount}) ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [pendingCount]);

  // Detectar pedidos pendientes nuevos entre polls
  useEffect(() => {
    if (!orders) return;

    const pending = orders.filter((o) => o.status === "PENDIENTE");
    const currentIds = new Set(pending.map((o) => o.id));

    if (knownPendingRef.current === null) {
      // Primera carga: baseline sin alertas
      knownPendingRef.current = currentIds;
      return;
    }

    const newOrders = pending.filter((o) => !knownPendingRef.current!.has(o.id));
    if (newOrders.length > 0) {
      playNewOrderSound();
      for (const order of newOrders) {
        markUnseen(order.id);
        notifyNewOrder(order.customerName, order.row, order.grupo);
      }
    }

    knownPendingRef.current = currentIds;
  }, [orders, markUnseen]);

  // Limpiar timers al desmontar
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return { unseenIds, markSeen };
}
