import { useMemo } from "react";

import { useElectionStatus } from "@kiesraad/api";
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
    const totalFirstEntry = statuses.filter((s) =>
      ["second_entry", "second_entry_unfinished", "second_entry_in_progress", "definitive"].includes(s.status),
    ).length;
    const totalDefinitive = statuses.filter((s) => s.status === "definitive").length;
    return [
      {
        title: t("status.first_entry_finished_short"),
        id: "first-entry-finished",
        percentage: total > 0 ? Math.round((totalFirstEntry / total) * 100) : 0,
      },
      {
        title: t("status.definitive_short"),
        id: "definitive",
        percentage: total > 0 ? Math.round((totalDefinitive / total) * 100) : 0,
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
