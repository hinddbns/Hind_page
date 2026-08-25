export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: string;
};

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

const DEFAULT_DURATION_MS: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
};

function notify() {
  for (const listener of listeners) listener(items);
}

function genId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function push(variant: ToastVariant, message: string, durationMs?: number) {
  const id = genId();
  items = [...items, { id, variant, message }];
  notify();
  const duration = durationMs ?? DEFAULT_DURATION_MS[variant];
  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), duration)
    );
  }
  return id;
}

export function dismissToast(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  items = items.filter((item) => item.id !== id);
  notify();
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  success: (message: string, durationMs?: number) => push("success", message, durationMs),
  error: (message: string, durationMs?: number) => push("error", message, durationMs),
  info: (message: string, durationMs?: number) => push("info", message, durationMs),
};
