import type { ReactNode } from "react";
import "./Tabs.css";

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange?: (id: string) => void;
  className?: string;
}

/**
 * LogosTabBar + LogosTabButton. 40px tabs, 14px/500 labels (active --primary,
 * inactive --text-tertiary), 3px --primary underline indicator on the active
 * tab that slides in 200ms. See docs/spec §Tabs.
 */
export function Tabs({ tabs, activeId, onChange, className }: TabsProps) {
  return (
    <div
      className={["ds-tabs", className].filter(Boolean).join(" ")}
      role="tablist"
    >
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={["ds-tab", active && "ds-tab--active"]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onChange?.(t.id)}
          >
            {t.icon && <span className="ds-tab__icon">{t.icon}</span>}
            <span className="ds-tab__label">{t.label}</span>
            <span className="ds-tab__indicator" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
