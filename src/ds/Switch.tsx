import "./Switch.css";

export interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * LogosSwitch. 36x20 track (on: --primary, off: --surface), 16x16 white handle
 * that slides over 120ms. Disabled dims to 0.5. See docs/spec §Toggle / switch.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
  className,
}: SwitchProps) {
  return (
    <span
      className={[
        "ds-switch-field",
        disabled && "ds-switch-field--disabled",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        id={id}
        className={["ds-switch", checked && "ds-switch--on"]
          .filter(Boolean)
          .join(" ")}
        onClick={() => onChange?.(!checked)}
      >
        <span className="ds-switch__track">
          <span className="ds-switch__handle" />
        </span>
      </button>
      {label && <span className="ds-switch__label">{label}</span>}
    </span>
  );
}
