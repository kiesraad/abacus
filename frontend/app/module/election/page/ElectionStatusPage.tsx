import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

import { PollingStationStatus, PollingStationStatusEntry, useElection, useElectionStatus } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconDot, IconPlus } from "@kiesraad/icon";
import {
  Alert,
  Button,
  Icon,
  PageTitle,
  PercentageAndColorClass,
  Progress,
  ProgressBar,
  ProgressBarColorClass,
  Table,
} from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./ElectionStatusPage.module.css";

const statusCategories = ["unfinished", "in_progress", "definitive", "not_started"] as const;
type StatusCategory = (typeof statusCategories)[number];

const categoryColorClass: Record<StatusCategory, ProgressBarColorClass> = {
  unfinished: "unfinished",
  definitive: "definitive",
  in_progress: "in-progress",
  not_started: "not-started",
};

const mapCategoryToStatus: Record<StatusCategory, PollingStationStatus> = {
  // TODO: future `second_entry_unfinished` status should be added to `unfinished`
  //  future `second_entry_in_progress` status should be added to `in_progress`
  unfinished: "first_entry_unfinished",
  definitive: "definitive",
  in_progress: "first_entry_in_progress",
  not_started: "not_started",
};

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
    return { ...ps, ...status };
  });

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
      <main className={cn(cls["status-main"])}>
        <div className={cn(cls["status-title"])}>
          <h2 id="status-title">{t("election_status.main_title")}</h2>
          {/* TODO: Add button onClick to Create Polling Station page */}
          <Button size="md" variant="secondary" leftIcon={<IconPlus />}>
            {t("election_status.add_polling_station")}
          </Button>
        </div>
        <div className={cn(cls["status-section"])}>
          <Progress>
            <div id="shortcuts" className="column">
              <h2 className="mb-0">{t("shortcuts")}</h2>
              {statusCategories.map((cat) => {
                return (
                  <span
                    className="item"
                    key={`item-progress-${categoryColorClass[cat]}`}
                    id={`item-progress-${categoryColorClass[cat]}`}
                  >
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
          <article className={cn(cls.statusArticle)}>
            {statusCategories.map((cat) => {
              return (
                <div key={`item-table-${categoryColorClass[cat]}`}>
                  <span className="item">
                    <Icon icon={<IconDot />} size="md" color={categoryColorClass[cat]} />
                    <h2 className="mb-0">
                      {t(`status.${cat}`)} <span className="normal">({categoryCounts[cat]})</span>
                    </h2>
                  </span>
                  <Table id={cat} key={cat}>
                    <Table.Header>
                      <Table.Column>{t("number")}</Table.Column>
                      <Table.Column>{t("polling_station")}</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {pollingStationsWithStatuses
                        .filter((ps) => ps.status === mapCategoryToStatus[cat])
                        .map((ps) => (
                          <Table.Row key={ps.id}>
                            <Table.Cell>{ps.number}</Table.Cell>
                            <Table.Cell>{ps.name}</Table.Cell>
                          </Table.Row>
                        ))}
                    </Table.Body>
                  </Table>
                </div>
              );
            })}
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
