export type ToastTone = "info" | "success" | "warn" | "error";

export type ToastInput = {
  title?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

export type ToastMessage = ToastInput & {
  id: number;
};

type ToastListener = (toast: ToastMessage) => void;

const DEFAULT_TOAST_DURATION_MS = 3000;

const listeners = new Set<ToastListener>();
let toastSequence = 0;

export const publishToast = (input: ToastInput): void => {
  const payload: ToastMessage = {
    id: ++toastSequence,
    tone: input.tone ?? "info",
    durationMs: input.durationMs ?? DEFAULT_TOAST_DURATION_MS,
    title: input.title,
    message: input.message
  };

  listeners.forEach((listener) => {
    listener(payload);
  });
};

export const subscribeToToasts = (listener: ToastListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
