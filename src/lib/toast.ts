/**
 * Toast notifications (Part 12, FR-12.3): short confirmations of finished actions and
 * background failures. Important outcomes are also shown on the page — a toast is never the
 * only record. A tiny external store, so any code (including mutation hooks) can notify.
 */
export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

/** How long a toast stays (errors longer, so they can be read). */
export const TOAST_MS: Record<ToastTone, number> = { success: 4_000, info: 5_000, error: 8_000 };
const MAX_VISIBLE = 4;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const toastStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => toasts,
  dismiss(id: number) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
  /** Test helper. */
  clear() {
    toasts = [];
    emit();
  },
};

function push(tone: ToastTone, message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, tone, message }].slice(-MAX_VISIBLE);
  emit();
  setTimeout(() => toastStore.dismiss(id), TOAST_MS[tone]);
  return id;
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
};
