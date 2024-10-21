import * as React from "react";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { IconDot } from "@kiesraad/icon";
import { Icon, PercentageAndColorClass, Progress, ProgressBar } from "@kiesraad/ui";

type Stat = {
  title: string;
  total: number;
  percentageAndColorClass: PercentageAndColorClass;
};

export function ElectionStatusProgress() {
  const { pollingStations } = useElection();
  const { statuses } = useElectionStatus();

  const stats: Stat[] = React.useMemo(() => {
    const total = pollingStations.length;
    const totalEntryInProgress = statuses.filter((s) => s.status === "first_entry").length;
    // TODO: future second_entry_in_progress status should be added to below variable
    const totalUnfinished = statuses.filter((s) => s.status === "first_entry_in_progress").length;
    const totalDefinitive = statuses.filter((s) => s.status === "definitive").length;

    return [
      {
        title: "Niet afgeronde invoer",
        total: totalUnfinished,
        percentageAndColorClass: { percentage: Math.round((totalUnfinished / total) * 100), class: "unfinished" },
      },
      {
        title: "Invoer bezig",
        total: totalEntryInProgress,
        percentageAndColorClass: { percentage: Math.round((totalEntryInProgress / total) * 100), class: "in_progress" },
      },
      {
        title: "Eerste invoer klaar", // TODO: Should change to "Eerste en tweede invoer klaar" when second entry is added
        total: totalDefinitive,
        percentageAndColorClass: { percentage: Math.round((totalDefinitive / total) * 100), class: "definitive" },
      },
    ];
  }, [pollingStations, statuses]);

  const percentagesAndColorClasses: PercentageAndColorClass[] = [];

  return (
    <Progress>
      <div className="column">
        <h2>Snelkoppelingen</h2>
        {stats.map((stat, index) => {
          percentagesAndColorClasses.push(stat.percentageAndColorClass);
          return (
            <span className="item" key={`item-${index}`}>
              <Icon icon={<IconDot />} size="sm" color={stat.percentageAndColorClass.class} /> {stat.title} (
              {stat.total})
            </span>
          );
        })}
      </div>
      <div className="column">
        <h2>Voortgang</h2>
        <ProgressBar key="all" id="all" data={percentagesAndColorClasses} spacing="small" />
      </div>
    </Progress>
  );
}
