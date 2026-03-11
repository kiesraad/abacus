import { useMemo } from "react";

import type { PercentageAndColorClass, ProgressBarColorClass } from "@/components/ui/ProgressBar/ProgressBar";
import { useUsers } from "@/hooks/user/useUsers";
import type { DataEntryStatusName, ElectionStatusResponseEntry } from "@/types/generated/openapi";

export const statusCategories = [
  "errors_and_warnings",
  "in_progress",
  "first_entry_finished",
  "definitive",
  "not_started",
] as const;

export type StatusCategory = (typeof statusCategories)[number];

export interface StatusEntryWithTypist {
  entry: ElectionStatusResponseEntry;
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
  errors_and_warnings: ["entries_different", "first_entry_has_errors"],
  in_progress: ["first_entry_in_progress", "second_entry_in_progress"],
  first_entry_finished: ["first_entry_finalised"],
  definitive: ["definitive"],
  not_started: ["empty"],
};

export function statusCount(entries: ElectionStatusResponseEntry[], category: StatusCategory): number {
  return entries.filter((s) => statusesForCategory[category].includes(s.status)).length;
}

function getTypist(status: ElectionStatusResponseEntry | undefined): number | undefined {
  switch (status?.status) {
    case "first_entry_in_progress":
    case "first_entry_finalised":
      return status.first_entry_user_id;
    case "second_entry_in_progress":
      return status.second_entry_user_id;
    default:
      return undefined;
  }
}

interface ElectionStatusData {
  progressBarData: PercentageAndColorClass[];
  categoryCounts: Record<StatusCategory, number>;
  statusEntriesWithTypist: StatusEntryWithTypist[];
  tableCategories: StatusCategory[];
}

export function useElectionStatus(statuses: ElectionStatusResponseEntry[]): ElectionStatusData {
  const { getName } = useUsers();

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

  const statusEntriesWithTypist = useMemo(
    () =>
      statuses.map((status) => ({
        entry: status,
        typist: getName(getTypist(status)),
      })),
    [statuses, getName],
  );

  const tableCategories = statusCategories.filter((cat) => categoryCounts[cat] !== 0);

  return {
    progressBarData,
    categoryCounts,
    statusEntriesWithTypist,
    tableCategories,
  };
}
