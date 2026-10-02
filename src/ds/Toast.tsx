import type { ReactNode } from "react";
import "./Toast.css";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastProps {
  message: ReactNode;
  variant?: ToastVariant;
  /** When provided, renders a dismiss affordance. */
  onDismiss?: () => void;
  className?: string;
}

/**
 * Toast / error banner (not designed in the DS — hand-rolled from tokens).
 * --surface fill, 8px radius, a left accent stripe colored by variant.
 * Errors use role="alert", others role="status". See docs/spec §4.
 */
export function Toast({
  message,
  variant = "info",
  onDismiss,
  className,
}: ToastProps) {
  return (
    <div
      className={["ds-toast", `ds-toast--${variant}`, className]
        .filter(Boolean)
        .join(" ")}
      role={variant === "error" ? "alert" : "status"}
    >
      <span className="ds-toast__message">{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="ds-toast__dismiss"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          ×
        </button>
      )}
    </div>
  );
}
