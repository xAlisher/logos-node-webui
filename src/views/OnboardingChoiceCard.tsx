import { Badge } from "../ds";
import "./onboarding.css";

export interface OnboardingChoiceCardProps {
  title: string;
  description: string;
  /** Optional success-coloured badge (e.g. "Recommended"). */
  badge?: string;
  selected: boolean;
  disabled?: boolean;
  onPick: () => void;
  "data-testid"?: string;
}

/**
 * OnboardingChoiceCard (views/OnboardingChoiceCard.qml) — one option in an
 * either/or choice, as a whole-card radio. The border does NOT change with
 * selection; the tick carries it. The entire card is clickable.
 */
export function OnboardingChoiceCard({
  title,
  description,
  badge,
  selected,
  disabled,
  onPick,
  "data-testid": testId,
}: OnboardingChoiceCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      className="onboarding-choice"
      onClick={onPick}
      data-testid={testId}
    >
      <span className="onboarding-choice__body">
        <span className="onboarding-choice__head">
          <span className="onboarding-choice__title">{title}</span>
          {badge && <Badge color="var(--success)">{badge}</Badge>}
        </span>
        <span className="onboarding-choice__desc">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={[
          "onboarding-choice__tick",
          selected && "onboarding-choice__tick--on",
        ]
          .filter(Boolean)
          .join(" ")}
        data-testid={testId ? `${testId}-tick` : undefined}
      />
    </button>
  );
}
