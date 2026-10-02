import type { ButtonHTMLAttributes } from "react";
import "./Button.css";

export type ButtonVariant = "neutral" | "primary";
export type ButtonSize = "default" | "compact";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `neutral` (default secondary style) or `primary` (orange CTA). */
  variant?: ButtonVariant;
  /** `default` (50px) or `compact` (~34px). */
  size?: ButtonSize;
}

/**
 * LogosButton. The DS master ships the neutral (secondary) style; `primary` and
 * `compact` are the prototype ds-additions. States: default / hover+pressed
 * (shared look) / disabled. See docs/spec/design-system.md §Button.
 */
export function Button({
  variant = "neutral",
  size = "default",
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    "ds-button",
    `ds-button--${variant}`,
    `ds-button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} type={type} {...rest}>
      {children}
    </button>
  );
}
