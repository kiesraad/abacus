import { Button } from "@/components/ui/Button/Button";
import { Circle } from "@/components/ui/Icon/Circle";
import { Progress } from "@/components/ui/ProgressBar/Progress";
import { ProgressBar } from "@/components/ui/ProgressBar/ProgressBar";
import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import { CommitteeSession, Election, ElectionStatusResponseEntry, PollingStation } from "@/types/generated/openapi";

import {
  categoryColorClass,
  statusCategories,
  statusesForCategory,
  useElectionStatus,
} from "../hooks/useElectionStatus";
import { CategoryHeader } from "./CategoryHeader";
import { CategoryRow } from "./CategoryRow";
import cls from "./ElectionStatus.module.css";

export interface ElectionStatusProps {
  statuses: ElectionStatusResponseEntry[];
  election: Required<Election>;
  committeeSession: CommitteeSession;
  pollingStations: PollingStation[];
  addLinks: boolean;
  navigate: (path: string) => void;
}

export function ElectionStatus({
  statuses,
  election,
  committeeSession,
  pollingStations,
  addLinks,
  navigate,
}: ElectionStatusProps) {
  const { progressBarData, categoryCounts, pollingStationWithStatusAndTypist, tableCategories } = useElectionStatus(
    statuses,
    pollingStations,
  );

  return (
    <>
      <div className={cls.container}>
        <div className={cls.statusTitle} id="status-heading">
          <h2>{t("election_status.main_title")}</h2>
          <div className={cls.buttons}>
            {committeeSession.number === 1 ? (
              <Button
                size="md"
                variant="secondary"
                onClick={() => {
                  navigate(`/elections/${election.id}/polling-stations`);
                }}
              >
                {t("polling_station.title.plural")}
              </Button>
            ) : (
              <Button
                size="md"
                variant="secondary"
                onClick={() => {
                  navigate(`/elections/${election.id}/investigations`);
                }}
              >
                {t("investigations.title")}
              </Button>
            )}
          </div>
        </div>
        <div className={cls.statusSection}>
          <Progress>
            <div id="polling-stations-per-status" className="column">
              <h3>{t("election_status.polling_stations_per_status")}</h3>
              {statusCategories.map((cat) => (
                <span
                  className="item"
                  key={`item-progress-${categoryColorClass[cat]}`}
                  id={`item-progress-${categoryColorClass[cat]}`}
                >
                  <Circle size="xxs" color={categoryColorClass[cat]} />
                  {t(`status.${cat}`)} ({categoryCounts[cat]})
                </span>
              ))}
            </div>
            <div id="progress" className="column">
              <h3>{t("progress")}</h3>
              <ProgressBar key="all" id="all" data={progressBarData} spacing="small" />
            </div>
          </Progress>
          <article className={cls.statusArticle}>
            {statuses.length === 0 && committeeSession.number === 1 && (
              <p>{t("election_status.no_polling_stations")}</p>
            )}
            {statuses.length === 0 && committeeSession.number > 1 && (
              <p>{t("election_status.no_investigations_with_corrected_results")}</p>
            )}
            {statuses.length > 0 &&
              tableCategories.map((cat) => (
                <div key={`item-table-${categoryColorClass[cat]}`}>
                  <span className="item">
                    <Circle size="xs" color={categoryColorClass[cat]} />
                    <h3>
                      {t(`status.${cat}`)} <span className="normal">({categoryCounts[cat]})</span>
                    </h3>
                  </span>
                  <Table id={cat} key={cat} aria-label={t(`status.${cat}`)}>
                    <CategoryHeader category={cat} />
                    <Table.Body key={cat} className="fs-sm">
                      {pollingStationWithStatusAndTypist
                        .filter((ps) => ps.status !== undefined && statusesForCategory[cat].includes(ps.status))
                        .map((ps) => (
                          <CategoryRow key={`${cat}-${ps.id}`} category={cat} pollingStation={ps} addLink={addLinks} />
                        ))}
                    </Table.Body>
                  </Table>
                </div>
              ))}
          </article>
        </div>
      </div>
    </>
  );
}
