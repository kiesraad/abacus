import { useMemo } from "react";

import { PercentageAndColorClass, ProgressBarColorClass } from "@/components/ui/ProgressBar/ProgressBar";
import { DataEntryStatusName, ElectionStatusResponseEntry, PollingStation, User } from "@/types/generated/openapi";

export const statusCategories = [
  "errors_and_warnings",
  "in_progress",
  "first_entry_finished",
  "definitive",
  "not_started",
] as const;

export type StatusCategory = (typeof statusCategories)[number];

export interface PollingStationWithStatusAndTypist extends PollingStation, Partial<ElectionStatusResponseEntry> {
  typist?: string;
}

export const categoryColorClass: Record<StatusCategory, ProgressBarColorClass> = {
  errors_and_warnings: "errors-and-warnings",
  in_progress: "in-progress",
  first_entry_finished: "first-entry-finished",
  definitive: "definitive",
  not_started: "not-started",
};

export const statusesForCategory: Record<StatusCategory, DataEntryStatusName[]> = {
  errors_and_warnings: ["entries_different"],
  in_progress: ["first_entry_in_progress", "second_entry_in_progress"],
  first_entry_finished: ["second_entry_not_started"],
  definitive: ["definitive"],
  not_started: ["first_entry_not_started"],
};

export function statusCount(entries: ElectionStatusResponseEntry[], category: StatusCategory): number {
  return entries.filter((s) => statusesForCategory[category].includes(s.status)).length;
}

function getTypistName(users: User[], status: ElectionStatusResponseEntry | undefined) {
  if (status === undefined || users.length === 0) {
    return "";
  }

  let typistId: number | undefined;
  switch (status.status) {
    case "first_entry_in_progress":
    case "second_entry_not_started":
      typistId = status.first_entry_user_id;
      break;
    case "second_entry_in_progress":
      typistId = status.second_entry_user_id;
      break;
    default:
      break;
  }

  if (typistId === undefined) {
    return "";
  }

  const user = users.find((user) => user.id === typistId);

  return user?.fullname ?? user?.username ?? "";
}

interface ElectionStatusData {
  progressBarData: PercentageAndColorClass[];
  categoryCounts: Record<StatusCategory, number>;
  pollingStationWithStatusAndTypist: PollingStationWithStatusAndTypist[];
  tableCategories: StatusCategory[];
}

export function useElectionStatus(
  statuses: ElectionStatusResponseEntry[],
  pollingStations: PollingStation[],
  users: User[],
): ElectionStatusData {
  const categoryCounts: Record<StatusCategory, number> = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      Object.fromEntries(statusCategories.map((cat) => [cat, statusCount(statuses, cat)])) as Record<
        StatusCategory,
        number
      >,
    [statuses],
  );

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

  const pollingStationWithStatusAndTypist = pollingStations.map((ps) => {
    const status = statuses.find((element) => element.polling_station_id === ps.id);
    return {
      ...ps,
      ...status,
      typist: getTypistName(users, status),
    } satisfies PollingStationWithStatusAndTypist;
  });

  const tableCategories = statusCategories.filter((cat) => categoryCounts[cat] !== 0);

  return {
    progressBarData,
    categoryCounts,
    pollingStationWithStatusAndTypist,
    tableCategories,
  };
}
