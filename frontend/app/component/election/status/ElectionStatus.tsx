import * as React from "react";

import { DataEntryStatusName, Election, ElectionStatusResponseEntry, PollingStation } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconPlus } from "@kiesraad/icon";
import {
  Badge,
  Button,
  Circle,
  PercentageAndColorClass,
  Progress,
  ProgressBar,
  ProgressBarColorClass,
  Table,
} from "@kiesraad/ui";
import { formatDateTime } from "@kiesraad/util";

import cls from "./ElectionStatus.module.css";

const statusCategories = [
  "errors_and_warnings",
  "in_progress",
  "first_entry_finished",
  "definitive",
  "not_started",
] as const;
type StatusCategory = (typeof statusCategories)[number];

export interface ElectionStatusProps {
  statuses: ElectionStatusResponseEntry[];
  election: Required<Election>;
  pollingStations: PollingStation[];
  navigate: (path: string) => void;
}

export function ElectionStatus({ statuses, election, pollingStations, navigate }: ElectionStatusProps) {
  const categoryCounts: Record<StatusCategory, number> = React.useMemo(
    () =>
      Object.fromEntries(statusCategories.map((cat) => [cat, statusCount(statuses, cat)])) as Record<
        StatusCategory,
        number
      >,
    [statuses],
  );

  const progressBarData: PercentageAndColorClass[] = React.useMemo(() => {
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

  const pollingStationsWithStatuses = pollingStations.map((ps) => {
    const status = statuses.find((element) => element.polling_station_id === ps.id);
    return { ...ps, ...status } as PollingStationWithStatus;
  });

  const tableCategories = statusCategories.filter((cat) => categoryCounts[cat] !== 0);

  return (
    <>
      <div className={cls.container}>
        <div className={cls.statusTitle}>
          <h2 id="status-title">{t("election_status.main_title")}</h2>
          <div className={cls.buttons}>
            <Button
              size="md"
              variant="secondary"
              leftIcon={<IconPlus />}
              onClick={() => {
                navigate(`/elections/${election.id}/polling-stations`);
              }}
            >
              {t("election_status.add_polling_station")}
            </Button>
          </div>
        </div>
        <div className={cls.statusSection}>
          <Progress>
            <div id="polling-stations-per-status" className="column">
              <h3 className="mb-0 heading-lg">{t("election_status.polling_stations_per_status")}</h3>
              {statusCategories.map((cat) => {
                return (
                  <span
                    className="item"
                    key={`item-progress-${categoryColorClass[cat]}`}
                    id={`item-progress-${categoryColorClass[cat]}`}
                  >
                    <Circle size="xxs" color={categoryColorClass[cat]} />
                    {t(`status.${cat}`)} ({categoryCounts[cat]})
                  </span>
                );
              })}
            </div>
            <div id="progress" className="column">
              <h3 className="mb-0 heading-lg">{t("progress")}</h3>
              <ProgressBar key="all" id="all" data={progressBarData} spacing="small" />
            </div>
          </Progress>
          <article className={cls.statusArticle}>
            {pollingStations.length === 0 ? (
              <p>{t("election_status.no_polling_stations")}</p>
            ) : (
              tableCategories.map((cat) => {
                return (
                  <div key={`item-table-${categoryColorClass[cat]}`}>
                    <span className="item">
                      <Circle size="xs" color={categoryColorClass[cat]} />
                      <h3 className="mb-0 heading-lg">
                        {t(`status.${cat}`)} <span className="normal">({categoryCounts[cat]})</span>
                      </h3>
                    </span>
                    <Table id={cat} key={cat}>
                      {getTableHeaderForCategory(cat)}
                      <Table.Body key={cat} className="fs-sm">
                        {pollingStationsWithStatuses
                          .filter((ps) => statusesForCategory[cat].includes(ps.status))
                          .map((ps) => getTableRowForCategory(cat, ps))}
                      </Table.Body>
                    </Table>
                  </div>
                );
              })
            )}
          </article>
        </div>
      </div>
    </>
  );
}

interface PollingStationWithStatus extends PollingStation, ElectionStatusResponseEntry {}

const categoryColorClass: Record<StatusCategory, ProgressBarColorClass> = {
  errors_and_warnings: "errors-and-warnings",
  in_progress: "in-progress",
  first_entry_finished: "first-entry-finished",
  definitive: "definitive",
  not_started: "not-started",
};

const statusesForCategory: Record<StatusCategory, DataEntryStatusName[]> = {
  errors_and_warnings: ["entries_different"],
  in_progress: ["first_entry_in_progress", "second_entry_in_progress"],
  first_entry_finished: ["second_entry_not_started"],
  definitive: ["definitive"],
  not_started: ["first_entry_not_started"],
};

function getTableHeaderForCategory(category: StatusCategory): React.ReactNode {
  function CategoryHeader({ children }: { children?: React.ReactNode[] }) {
    return (
      <Table.Header key={category} className="bg-gray">
        <Table.Column key={`${category}-number`} className="text-align-r">
          {t("number")}
        </Table.Column>
        <Table.Column key={`${category}-name`}>{t("polling_station.title.singular")}</Table.Column>
        {children}
      </Table.Header>
    );
  }

  const finishedAtColumn = <Table.Column key={`${category}-time`}>{t("finished_at")}</Table.Column>;
  const progressColumn = (
    <Table.Column key={`${category}-progress`} className="w-13">
      {t("progress")}
    </Table.Column>
  );

  switch (category) {
    case "in_progress":
      return <CategoryHeader>{[progressColumn]}</CategoryHeader>;
    case "first_entry_finished":
    case "definitive":
      return <CategoryHeader>{[finishedAtColumn]}</CategoryHeader>;
    default:
      return <CategoryHeader />;
  }
}

function getTableRowForCategory(category: StatusCategory, polling_station: PollingStationWithStatus): React.ReactNode {
  const showBadge: DataEntryStatusName[] = ["first_entry_in_progress", "second_entry_in_progress", "entries_different"];

  function CategoryPollingStationRow({ children }: { children?: React.ReactNode[] }) {
    return (
      <Table.Row>
        <Table.NumberCell key={`${polling_station.id}-number`} className="text-align-r">
          {polling_station.number}
        </Table.NumberCell>
        <Table.Cell key={`${polling_station.id}-name`}>
          <span>{polling_station.name}</span>
          {showBadge.includes(polling_station.status) && <Badge type={polling_station.status} />}
        </Table.Cell>
        {children}
      </Table.Row>
    );
  }

  const finishedAtCell = (
    <Table.Cell key={`${polling_station.id}-time`}>
      {polling_station.finished_at ? formatDateTime(new Date(polling_station.finished_at)) : ""}
    </Table.Cell>
  );
  const progressCell = (
    <Table.Cell key={`${polling_station.id}-progress`}>
      <ProgressBar
        id={`${polling_station.id}-progressbar`}
        data={{
          percentage: polling_station.second_data_entry_progress ?? polling_station.first_data_entry_progress ?? 0,
          class: "default",
        }}
        showPercentage
      />
    </Table.Cell>
  );
  // TODO: Needs to be updated when user accounts are implemented
  switch (category) {
    case "in_progress":
      return <CategoryPollingStationRow key={polling_station.id}>{[progressCell]}</CategoryPollingStationRow>;
    case "first_entry_finished":
    case "definitive":
      return <CategoryPollingStationRow key={polling_station.id}>{[finishedAtCell]}</CategoryPollingStationRow>;
    default:
      return <CategoryPollingStationRow key={polling_station.id} />;
  }
}

function statusCount(entries: ElectionStatusResponseEntry[], category: StatusCategory): number {
  return entries.filter((s) => statusesForCategory[category].includes(s.status)).length;
}
