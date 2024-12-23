import { useMemo } from "react";

import { PollingStationStatus, useElectionStatus } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Progress, ProgressBar } from "@kiesraad/ui";

type Stat = {
  title: string;
  id: string;
  percentage: number;
};

export function ElectionProgress() {
  const { statuses } = useElectionStatus();

  const stats: Stat[] = useMemo(() => {
    const total = statuses.length;
    const firstAndSecondEntryFinished: PollingStationStatus[] = ["first_second_entry_different", "definitive"];
    const firstEntryFinished: PollingStationStatus[] = [
      "second_entry",
      "second_entry_unfinished",
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
        percentage: total > 0 ? Math.round((totalFirstEntryFinished / total) * 100) : 0,
      },
      {
        title: t("status.first_and_second_entry_finished"),
        id: "first-and-second-entry-finished",
        percentage: total > 0 ? Math.round((totalFirstAndSecondEntryFinished / total) * 100) : 0,
      },
    ];
  }, [statuses]);

  return (
    <Progress>
      <div>
        <h2 className="mb-lg">{t("progress")}</h2>
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
