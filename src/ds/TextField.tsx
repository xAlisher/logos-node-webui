import type { InputHTMLAttributes } from "react";
import "./TextField.css";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional caption rendered above the field. */
  label?: string;
}

/**
 * LogosTextField. 40px tall, 4px radius, dark surface fill; the border goes
 * orange on focus (--overlay-orange). See docs/spec §Text field.
 */
export function TextField({ label, className, id, ...rest }: TextFieldProps) {
  const inputId =
    id ?? (label ? `tf-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const input = (
    <input
      className={["ds-textfield", className].filter(Boolean).join(" ")}
      id={inputId}
      {...rest}
    />
  );
  if (!label) return input;
  return (
    <label className="ds-textfield-label" htmlFor={inputId}>
      <span className="ds-textfield-label__text">{label}</span>
      {input}
    </label>
  );
}
