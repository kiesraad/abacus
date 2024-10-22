import * as React from "react";

import { PollingStationStatus, PollingStationStatusEntry, useElection, useElectionStatus } from "@kiesraad/api";
import { IconDot } from "@kiesraad/icon";
import { Icon, PercentageAndColorClass, Progress, ProgressBar, ProgressBarColorClass } from "@kiesraad/ui";

const statusCategories = ["in_progress", "unfinished", "definitive", "not_started"] as const;
type StatusCategory = (typeof statusCategories)[number];

const categoryTitle: Record<StatusCategory, string> = {
  unfinished: "Niet afgeronde invoer",
  in_progress: "Invoer bezig",
  definitive: "Eerste invoer klaar", // TODO: in the future this changes to `Eerste en tweede invoer klaar`
  not_started: "Werkvoorraad",
};

const categoryColorClass: Record<StatusCategory, ProgressBarColorClass> = {
  unfinished: "unfinished",
  in_progress: "in-progress",
  definitive: "definitive",
  not_started: "not-started",
};

function statusCount(entries: PollingStationStatusEntry[], status: PollingStationStatus): number {
  return entries.filter((s) => s.status === status).length;
}

export function ElectionStatusProgress() {
  const { pollingStations } = useElection();
  const { statuses } = useElectionStatus();

  const categoryCounts: Record<StatusCategory, number> = React.useMemo(() => {
    // TODO: future `second_entry_unfinished` status should be added to `unfinished`
    //  future `second_entry_in_progress` status should be added to `in_progress`
    return {
      unfinished: statusCount(statuses, "first_entry_unfinished"),
      in_progress: statusCount(statuses, "first_entry_in_progress"),
      definitive: statusCount(statuses, "definitive"),
      not_started: statusCount(statuses, "first_entry"),
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
