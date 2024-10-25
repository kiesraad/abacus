import { useMemo } from "react";

import { useElectionStatus } from "@kiesraad/api";
import { Progress, ProgressBar } from "@kiesraad/ui";

type Stat = {
  title: string;
  id: string;
  total: number;
  percentage: number;
};

export function ElectionProgress() {
  const { statuses } = useElectionStatus();

  const stats: Stat[] = useMemo(() => {
    const total = statuses.length;
    const totalDefinitive = statuses.filter((s) => s.status === "definitive").length;
    return [
      {
        title: "Alles samen",
        id: "definitive",
        total: totalDefinitive,
        percentage: total > 0 ? Math.round(totalDefinitive / total) * 100 : 0,
      },
    ];
  }, [statuses]);

  return (
    <Progress>
      <div>
        <h2 className="form_title">Voortgang</h2>
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
