import * as React from "react";

import { PollingStationStatus, PollingStationStatusEntry, useElection, useElectionStatus } from "@kiesraad/api";
import { IconDot } from "@kiesraad/icon";
import { Icon, PercentageAndColorClass, Progress, ProgressBar, ProgressBarColorClass } from "@kiesraad/ui";

const statusCategories = ["in_progress", "unfinished", "definitive"] as const;
type StatusCategory = (typeof statusCategories)[number];

const categoryTitle: Record<StatusCategory, string> = {
  in_progress: "Invoer bezig",
  unfinished: "Niet afgeronde invoer",
  definitive: "Eerste invoer klaar",
};

const categoryColorClass: Record<StatusCategory, ProgressBarColorClass> = {
  in_progress: "in-progress",
  unfinished: "unfinished",
  definitive: "definitive",
};

function statusCount(entries: PollingStationStatusEntry[], status: PollingStationStatus): number {
  return entries.filter((s) => s.status === status).length;
}

export function ElectionStatusProgress() {
  const { pollingStations } = useElection();
  const { statuses } = useElectionStatus();

  const categoryCounts: Record<StatusCategory, number> = React.useMemo(() => {
    // TODO: future second_entry_in_progress status should be added to below object
    return {
      in_progress: statusCount(statuses, "first_entry"),
      unfinished: statusCount(statuses, "first_entry_in_progress"),
      definitive: statusCount(statuses, "definitive"),
    };
  }, [statuses]);

  const progressBarData: PercentageAndColorClass[] = React.useMemo(() => {
    const total = pollingStations.length;
    return statusCategories.map((cat) => ({
      percentage: Math.round(categoryCounts[cat] / total) * 100,
      class: categoryColorClass[cat],
    }));
  }, [pollingStations, categoryCounts]);

  return (
    <Progress>
      <div className="column">
        <h2>Snelkoppelingen</h2>
        {statusCategories.map((cat) => {
          return (
            <span className="item" key={`item-${cat}`}>
              <Icon icon={<IconDot />} size="sm" color={categoryColorClass[cat]} />
              {categoryTitle[cat]} ({categoryCounts[cat]})
            </span>
          );
        })}
      </div>
      <div className="column">
        <h2>Voortgang</h2>
        <ProgressBar key="all" id="all" data={progressBarData} spacing="small" />
      </div>
    </Progress>
  );
}
