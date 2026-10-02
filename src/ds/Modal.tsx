import { useEffect } from "react";
import type { ReactNode } from "react";
import "./Modal.css";

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  /** Action row rendered at the bottom. */
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * LogosDialog. --background-secondary panel, 1px --border, 8px radius, 16px
 * padding over a dimmed backdrop. Title 14px/700. Closes on backdrop click or
 * Escape. See docs/spec §Dialog / modal.
 */
export function Modal({
  open,
  onClose,
  title,
  footer,
  children,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ds-modal__backdrop" onClick={() => onClose?.()}>
      <div
        className={["ds-modal", className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {title != null && <div className="ds-modal__header">{title}</div>}
        <div className="ds-modal__body">{children}</div>
        {footer != null && <div className="ds-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
