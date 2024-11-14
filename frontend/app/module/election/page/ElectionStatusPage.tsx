import { ReactNode, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

import {
  PollingStation,
  PollingStationStatus,
  PollingStationStatusEntry,
  useElection,
  useElectionStatus,
} from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconPlus } from "@kiesraad/icon";
import {
  Alert,
  Badge,
  Button,
  Circle,
  PageTitle,
  PercentageAndColorClass,
  Progress,
  ProgressBar,
  ProgressBarColorClass,
  Table,
} from "@kiesraad/ui";

import cls from "./ElectionStatusPage.module.css";

interface PollingStationWithStatus extends PollingStation, PollingStationStatusEntry {}

const statusCategories = ["unfinished", "in_progress", "definitive", "not_started"] as const;
type StatusCategory = (typeof statusCategories)[number];

const categoryColorClass: Record<StatusCategory, ProgressBarColorClass> = {
  unfinished: "unfinished",
  in_progress: "in-progress",
  definitive: "definitive",
  not_started: "not-started",
};

const categoryToStatus: Record<StatusCategory, PollingStationStatus> = {
  // TODO: future `second_entry_unfinished` status should be added to `unfinished`
  //  future `second_entry_in_progress` status should be added to `in_progress`
  unfinished: "first_entry_unfinished",
  in_progress: "first_entry_in_progress",
  definitive: "definitive",
  not_started: "not_started",
};

function getTableHeaderForCategory(category: StatusCategory): ReactNode {
  function CategoryHeader({ children }: { children?: ReactNode[] }) {
    return (
      <Table.Header key={category} backgroundStyling>
        <Table.Column key={`${category}-number`}>{t("number")}</Table.Column>
        <Table.Column key={`${category}-name`}>{t("polling_station")}</Table.Column>
        {children}
      </Table.Header>
    );
  }

  const finishedAtColumn = <Table.Column key={`${category}-time`}>{t("finished_at")}</Table.Column>;
  const progressColumn = (
    <Table.Column key={`${category}-progress`} width="12rem">
      {t("progress")}
    </Table.Column>
  );
  // TODO: Needs to be updated when second entry is implemented
  if (category === "unfinished") {
    return <CategoryHeader />;
  } else if (category === "in_progress") {
    return <CategoryHeader>{[progressColumn]}</CategoryHeader>;
  } else if (category === "definitive") {
    return <CategoryHeader>{[finishedAtColumn]}</CategoryHeader>;
  } else {
    return <CategoryHeader></CategoryHeader>;
  }
}

function getTableRowForCategory(category: StatusCategory, polling_station: PollingStationWithStatus): ReactNode {
  // TODO: future `errors_and_warnings` status should be added to showBadge array
  const showBadge = ["first_entry_unfinished", "first_entry_in_progress"];

  function CategoryPollingStationRow({ children }: { children?: ReactNode[] }) {
    return (
      <Table.Row>
        <Table.Cell key={`${polling_station.id}-number`} number fontSizeClass="fs-body">
          {polling_station.number}
        </Table.Cell>
        <Table.Cell key={`${polling_station.id}-name`} fontSizeClass="fs-sm">
          <span>{polling_station.name}</span>
          {showBadge.includes(polling_station.status) && <Badge type={polling_station.status} />}
        </Table.Cell>
        {children}
      </Table.Row>
    );
  }

  const finishedAtCell = (
    <Table.Cell key={`${polling_station.id}-time`} fontSizeClass="fs-sm">
      {polling_station.finished_at
        ? new Date(polling_station.finished_at * 1000).toLocaleTimeString("nl-NL", {
            timeStyle: "short",
            hour12: false,
          })
        : ""}
    </Table.Cell>
  );
  const progressCell = (
    <Table.Cell key={`${polling_station.id}-progress`} fontSizeClass="fs-sm">
      <ProgressBar
        id={`${polling_station.id}-progressbar`}
        data={{ percentage: polling_station.data_entry_progress ?? 0, class: "default" }}
        showPercentage
      />
    </Table.Cell>
  );
  // TODO: Needs to be updated when second entry is implemented and when user accounts are implemented
  if (category === "unfinished") {
    return <CategoryPollingStationRow key={polling_station.id} />;
  } else if (category === "in_progress") {
    return <CategoryPollingStationRow key={polling_station.id}>{[progressCell]}</CategoryPollingStationRow>;
  } else if (category === "definitive") {
    return <CategoryPollingStationRow key={polling_station.id}>{[finishedAtCell]}</CategoryPollingStationRow>;
  } else {
    return <CategoryPollingStationRow key={polling_station.id}></CategoryPollingStationRow>;
  }
}

function statusCount(entries: PollingStationStatusEntry[], status: PollingStationStatus): number {
  return entries.filter((s) => s.status === status).length;
}

export function ElectionStatusPage() {
  const navigate = useNavigate();
  const { election, pollingStations } = useElection();
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

  function finishInput() {
    navigate("../report#coordinator");
  }

  const pollingStationsWithStatuses = pollingStations.map((ps) => {
    const status = statuses.find((element) => element.id === ps.id);
    return { ...ps, ...status } as PollingStationWithStatus;
  });

  const tableCategories = statusCategories.filter((cat) => categoryCounts[cat] !== 0);

  return (
    <>
      <PageTitle title={t("election_status.title")} />
      <NavBar>
        <Link to={`/elections/${election.id}#coordinator`}>
          <span className="bold">{election.location}</span>
          <span>&mdash;</span>
          <span>{election.name}</span>
        </Link>
      </NavBar>
      <header>
        <section>
          <h1>{t("election_status.first_session")}</h1>
        </section>
      </header>
      {statuses.length > 0 && statuses.every((s) => s.status === "definitive") && (
        <Alert type="success">
          <h2>{t("election_status.definitive.title")}</h2>
          <p>{t("election_status.definitive.message")}</p>
          <Button onClick={finishInput} size="md">
            {t("election_status.definitive.finish_button")}
          </Button>
        </Alert>
      )}
      <main className={cls.statusMain}>
        <div className={cls.statusTitle}>
          <h2 id="status-title">{t("election_status.main_title")}</h2>
          <div className={cls.buttons}>
            {/* TODO: Add button onClick to Create Polling Station page */}
            <Button size="md" variant="secondary" leftIcon={<IconPlus />}>
              {t("election_status.add_polling_station")}
            </Button>
          </div>
        </div>
        <div className={cls.statusSection}>
          <Progress>
            <div id="polling-stations-per-status" className="column">
              <h3 className="mb-0 h2">{t("election_status.polling_stations_per_status")}</h3>
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
              <h3 className="mb-0 h2">{t("progress")}</h3>
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
                      <h3 className="mb-0 h2">
                        {t(`status.${cat}`)} <span className="normal">({categoryCounts[cat]})</span>
                      </h3>
                    </span>
                    <Table id={cat} key={cat}>
                      {getTableHeaderForCategory(cat)}
                      <Table.Body key={cat}>
                        {pollingStationsWithStatuses
                          .filter((ps) => ps.status === categoryToStatus[cat])
                          .map((ps) => getTableRowForCategory(cat, ps))}
                      </Table.Body>
                    </Table>
                  </div>
                );
              })
            )}
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
