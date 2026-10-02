// Global toast host — the web analogue of BlockchainView.qml's overlay-parented
// LogosToast instances (keystoreBackupToast + stopFailedToast). The shell owns one
// host; everything that needs to surface a transient message calls showToast().
//
// Two shell toasts ride on this host:
//   • keystore-backup success — "Keystore saved" + the path (shell-keystore-backup-toast)
//   • stop/update failure      — "Couldn't stop the node" / "Couldn't update the config"
//     + the reason (shell-stop-failed-toast)

import { useCallback, useRef, useState } from "react";

import { Toast, type ToastVariant } from "../ds";

export interface ShellToast {
  id: number;
  variant: ToastVariant;
  title: string;
  /** Secondary line (path / failure reason). */
  detail?: string;
  /** Auto-dismiss after this many ms (0 = sticky until dismissed). */
  durationMs?: number;
}

export interface ToastController {
  toasts: readonly ShellToast[];
  showToast: (t: Omit<ShellToast, "id">) => number;
  dismiss: (id: number) => void;
}

/** Hook the shell holds: a small queue of toasts + show/dismiss. */
export function useToastHost(): ToastController {
  const [toasts, setToasts] = useState<ShellToast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (t: Omit<ShellToast, "id">) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { ...t, id }]);
      const duration = t.durationMs ?? 6000;
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  return { toasts, showToast, dismiss };
}

export interface ToastHostProps {
  controller: ToastController;
}

/** Renders the shell's toast stack, anchored bottom-centre like the QML overlay. */
export function ToastHost({ controller }: ToastHostProps) {
  const { toasts, dismiss } = controller;
  if (toasts.length === 0) return null;
  return (
    <div className="shell-toast-host" data-testid="shell-toast-host">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant}
          onDismiss={() => dismiss(t.id)}
          message={
            <span data-testid={`shell-toast-${t.variant}`}>
              <strong>{t.title}</strong>
              {t.detail ? <span className="shell-toast__detail"> — {t.detail}</span> : null}
            </span>
          }
        />
      ))}
    </div>
  );
}
