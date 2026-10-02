import { useEffect, useRef, useState } from "react";
import "./Select.css";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}

const chevron = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M5 8l5 5 5-5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * LogosComboBox. 32px closed control, chevron, popup list offset 2px below.
 * Highlighted option rows take the --surface fill. See docs/spec §Select.
 */
export function Select({
  options,
  value,
  placeholder = "Select…",
  disabled,
  onChange,
  className,
  ...rest
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const cls = ["ds-select", disabled && "ds-select--disabled", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} ref={rootRef}>
      <button
        type="button"
        className="ds-select__control"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        {...rest}
      >
        <span
          className={[
            "ds-select__value",
            !selected && "ds-select__value--placeholder",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {selected ? selected.label : placeholder}
        </span>
        <span className="ds-select__chevron">{chevron}</span>
      </button>
      {open && !disabled && (
        <ul className="ds-select__popup" role="listbox">
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={[
                "ds-select__option",
                o.value === value && "ds-select__option--selected",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                onChange?.(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
