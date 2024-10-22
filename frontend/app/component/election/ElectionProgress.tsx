import * as React from "react";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { Progress, ProgressBar } from "@kiesraad/ui";

type Stat = {
  title: string;
  id: string;
  total: number;
  percentage: number;
};

export function ElectionProgress() {
  const { pollingStations } = useElection();
  const { statuses } = useElectionStatus();

  const stats: Stat[] = React.useMemo(() => {
    const total = pollingStations.length;
    const totalDefinitive = statuses.filter((s) => s.status === "definitive").length;

    return [
      {
        title: "Alles samen",
        id: "definitive",
        total: totalDefinitive,
        percentage: totalDefinitive / total,
      },
    ];
  }, [pollingStations, statuses]);

  return (
    <Progress>
      <div>
        <h2 className="form_title">Voortgang</h2>
        {stats.map((stat) => (
          <ProgressBar
            key={stat.id}
            id={stat.id}
            data={{ percentage: Math.round(stat.percentage * 100), class: "default" }}
            title={stat.title}
            spacing="small"
            showPercentage
          />
        ))}
      </div>
    </Progress>
  );
}
