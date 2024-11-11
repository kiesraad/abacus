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
    const totalDefinitive = statuses.filter((s) => s.status === "definitive").length;
    return [
      {
        title: t("all_together"),
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
