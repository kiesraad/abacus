import { useMemo } from "react";

import { PollingStationStatus, PollingStationStatusEntry, useElectionStatus } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconDot } from "@kiesraad/icon";
import { Icon, PercentageAndColorClass, Progress, ProgressBar, ProgressBarColorClass } from "@kiesraad/ui";

const statusCategories = ["in_progress", "unfinished", "definitive", "not_started"] as const;
type StatusCategory = (typeof statusCategories)[number];

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
  const { statuses } = useElectionStatus();

  const categoryCounts: Record<StatusCategory, number> = useMemo(() => {
    // TODO: future `second_entry_unfinished` status should be added to `unfinished`
    //  future `second_entry_in_progress` status should be added to `in_progress`
    return {
      unfinished: statusCount(statuses, "first_entry_unfinished"),
      in_progress: statusCount(statuses, "first_entry_in_progress"),
      definitive: statusCount(statuses, "definitive"),
      not_started: statusCount(statuses, "not_started"),
    };
  }, [statuses]);

  const progressBarData: PercentageAndColorClass[] = useMemo(() => {
    const total = statuses.length;
    // Reverse the categories and make sure not started is at the end of the progress bar
    const [notStarted, ...data] = statusCategories
      .map((cat) => ({
        percentage: total > 0 ? Math.round((categoryCounts[cat] / total) * 100) : 0,
        class: categoryColorClass[cat],
      }))
      .reverse();
    if (notStarted) {
      data.push(notStarted);
    }
    return data;
  }, [statuses, categoryCounts]);

  return (
    <Progress>
      <div id="shortcuts" className="column">
        <h2>{t("shortcuts")}</h2>
        {statusCategories.map((cat) => {
          return (
            <span className="item" key={`item-${categoryColorClass[cat]}`} id={`item-${categoryColorClass[cat]}`}>
              <Icon icon={<IconDot />} size="sm" color={categoryColorClass[cat]} />
              {t(`status.${cat}`)} ({categoryCounts[cat]})
            </span>
          );
        })}
      </div>
      <div id="progress" className="column">
        <h2>{t("progress")}</h2>
        <ProgressBar key="all" id="all" data={progressBarData} spacing="small" />
      </div>
    </Progress>
  );
}
