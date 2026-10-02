// A web replica of LogosStageLane: a horizontal rail of lifecycle stages. Stages
// before `currentIndex` are complete, the one at it is in progress (busy) or failed,
// and the rest are pending. The current stage shows its busyLabel while busy.

import "./StageLane.css";

export interface Stage {
  label: string;
  busyLabel?: string;
}

export interface StageLaneProps {
  stages: Stage[];
  /** -1 = nothing started; index of the in-progress stage otherwise. */
  currentIndex: number;
  busy?: boolean;
  failed?: boolean;
}

type StageState = "complete" | "current" | "pending";

export function StageLane({ stages, currentIndex, busy = false, failed = false }: StageLaneProps) {
  return (
    <div className="stage-lane" data-testid="stage-lane" role="list" data-current={currentIndex}>
      {stages.map((stage, i) => {
        const state: StageState =
          i < currentIndex ? "complete" : i === currentIndex ? "current" : "pending";
        const isBusy = state === "current" && busy && !failed;
        const isFailed = state === "current" && failed;
        const label = isBusy && stage.busyLabel ? stage.busyLabel : stage.label;
        return (
          <div
            className="stage-lane__stage"
            role="listitem"
            key={stage.label}
            data-state={isFailed ? "failed" : state}
            data-busy={isBusy || undefined}
          >
            <span className="stage-lane__dot" aria-hidden="true" />
            <span className="stage-lane__label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
