import { IconPlus } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Circle } from "@/components/ui/Icon/Circle";
import { Progress } from "@/components/ui/ProgressBar/Progress";
import { ProgressBar } from "@/components/ui/ProgressBar/ProgressBar";
import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import { Election, ElectionStatusResponseEntry, PollingStation, User } from "@/types/generated/openapi";

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
  pollingStations: PollingStation[];
  navigate: (path: string) => void;
  users: User[];
}

export function ElectionStatus({ statuses, election, pollingStations, navigate, users }: ElectionStatusProps) {
  const { progressBarData, categoryCounts, pollingStationWithStatusAndTypist, tableCategories } = useElectionStatus(
    statuses,
    pollingStations,
    users,
  );

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
              <h3 className="mb-0 heading-lg">{t("progress")}</h3>
              <ProgressBar key="all" id="all" data={progressBarData} spacing="small" />
            </div>
          </Progress>
          <article className={cls.statusArticle}>
            {pollingStations.length === 0 && <p>{t("election_status.no_polling_stations")}</p>}
            {pollingStations.length > 0 &&
              tableCategories.map((cat) => (
                <div key={`item-table-${categoryColorClass[cat]}`}>
                  <span className="item">
                    <Circle size="xs" color={categoryColorClass[cat]} />
                    <h3 className="mb-0 heading-lg">
                      {t(`status.${cat}`)} <span className="normal">({categoryCounts[cat]})</span>
                    </h3>
                  </span>
                  <Table id={cat} key={cat} aria-label={t(`status.${cat}`)}>
                    <CategoryHeader category={cat} />
                    <Table.Body key={cat} className="fs-sm">
                      {pollingStationWithStatusAndTypist
                        .filter((ps) => ps.status !== undefined && statusesForCategory[cat].includes(ps.status))
                        .map((ps) => (
                          <CategoryRow key={`${cat}-${ps.id}`} category={cat} pollingStation={ps} />
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
