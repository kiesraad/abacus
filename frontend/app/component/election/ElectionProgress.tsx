import * as React from "react";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { ProgressBar } from "@kiesraad/ui";

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
    const totalFirstEntry = statuses.filter((s) => s.status === "first_entry").length;
    const totalDefinitive = statuses.filter((s) => s.status === "definitive").length;

    return [
      {
        title: "Eerste invoer",
        id: "first_entry",
        total: totalFirstEntry,
        percentage: totalFirstEntry / total,
      },
      {
        title: "Alles samen",
        id: "definitive",
        total: totalDefinitive,
        percentage: totalDefinitive / total,
      },
    ];
  }, [pollingStations, statuses]);

  return (
    <div>
      {stats.map((stat) => (
        <ProgressBar
          key={stat.id}
          id={stat.id}
          title={stat.title}
          percent={Math.round(stat.percentage * 100)}
          spacing="small"
        />
      ))}
    </div>
  );
}
