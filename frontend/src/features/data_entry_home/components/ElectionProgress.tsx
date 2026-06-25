import { useMemo } from "react";

import { Progress } from "@/components/ui/ProgressBar/Progress";
import { ProgressBar } from "@/components/ui/ProgressBar/ProgressBar";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { t } from "@/i18n/translate";
import type { DataEntryStatusName } from "@/types/generated/openapi";
import { calculateProgressPercentage } from "@/utils/progressPercentage";

type Stat = {
  title: string;
  id: string;
  percentage: number;
};

export function ElectionProgress() {
  const { statuses } = useElectionStatus();

  const stats: Stat[] = useMemo(() => {
    const total = statuses.length;
    const firstAndSecondEntryFinished: DataEntryStatusName[] = ["entries_different", "definitive"];
    const firstEntryFinished: DataEntryStatusName[] = [
      "first_entry_finalised",
      "second_entry_in_progress",
      ...firstAndSecondEntryFinished,
    ];
    const totalFirstEntryFinished = statuses.filter((s) => firstEntryFinished.includes(s.status)).length;
    const totalFirstAndSecondEntryFinished = statuses.filter((s) =>
      firstAndSecondEntryFinished.includes(s.status),
    ).length;
    return [
      {
        title: t("status.first_entry_finished_short"),
        id: "first-entry-finished",
        // The percentage is rounded up when between 0.5 and 1, so that progress is not set to 0% for too long, when the total is large.
        percentage: calculateProgressPercentage(totalFirstEntryFinished, total, 0.5, 1),
      },
      {
        title: t("status.first_and_second_entry_finished"),
        id: "first-and-second-entry-finished",
        // The percentage is rounded up when between 0.5 and 1, so that progress is not set to 0% for too long, when the total is large.
        percentage: calculateProgressPercentage(totalFirstAndSecondEntryFinished, total, 0.5, 1),
      },
    ];
  }, [statuses]);

  return (
    <Progress>
      <div>
        <h3 className="mb-lg">{t("progress")}</h3>
        {stats.map((stat) => (
          <ProgressBar
            key={stat.id}
            id={stat.id}
            data={{ percentage: stat.percentage, class: "default" }}
            title={stat.title}
            spacing="small"
            showPercentage
          />
        ))}
      </div>
    </Progress>
  );
}
