import { Button } from "@/components/ui/Button/Button";
import { Circle } from "@/components/ui/Icon/Circle";
import { Progress } from "@/components/ui/ProgressBar/Progress";
import { ProgressBar } from "@/components/ui/ProgressBar/ProgressBar";
import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { CommitteeSession, Election, ElectionStatusResponseEntry } from "@/types/generated/openapi";
import { sortList } from "@/utils/sorting";
import {
  categoryColorClass,
  type StatusCategory,
  type StatusEntryWithTypist,
  statusCategories,
  statusesForCategory,
  useElectionStatus,
} from "../hooks/useElectionStatus";
import { CategoryHeader } from "./CategoryHeader";
import { CategoryRow } from "./CategoryRow";
import { DataEntryImportButton } from "./DataEntryImportButton";
import cls from "./ElectionStatus.module.css";

function sortTableRows(cat: StatusCategory, list: StatusEntryWithTypist[]) {
  switch (cat) {
    case "errors_and_warnings":
      // Sort on updated_at ascending
      return list.sort((a, b) => a.entry.updated_at.localeCompare(b.entry.updated_at));
    case "first_entry_finished":
      // Sort on finished_at ascending
      return list.sort((a, b) => {
        if (!a.entry.finished_at) return 1;
        if (!b.entry.finished_at) return -1;

        return a.entry.finished_at.localeCompare(b.entry.finished_at);
      });
    case "not_started":
    case "in_progress":
      // Sort on polling station number or subcommittee name ascending
      return sortList(list, (item) => item.entry.source);
    case "definitive":
      // Sort on finished_at descending
      return list.sort((a, b) => {
        if (!a.entry.finished_at) return 1;
        if (!b.entry.finished_at) return -1;

        return b.entry.finished_at.localeCompare(a.entry.finished_at);
      });
  }
}

export interface ElectionStatusProps {
  statuses: ElectionStatusResponseEntry[];
  election: Election;
  committeeSession: CommitteeSession;
  addLinks: boolean;
  navigate: (path: string) => void;
}

export function ElectionStatus({ statuses, election, committeeSession, addLinks, navigate }: ElectionStatusProps) {
  const { progressBarData, categoryCounts, statusEntriesWithTypist, tableCategories } = useElectionStatus(statuses);

  return (
    <div className={cls.container}>
      <div className={cls.statusTitle} id="status-heading">
        <h2>{t("election_status.main_title")}</h2>
        <div className={cls.buttons}>
          {election.committee_category === "GSB" &&
            (committeeSession.number === 1 ? (
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
            ))}

          <DataEntryImportButton election={election} committeeSession={committeeSession} navigate={navigate} />
        </div>
      </div>
      <div className={cls.statusSection}>
        <Progress>
          <div id="polling-stations-per-status" className="column">
            <h3>{t("election_status.polling_stations_per_status")}</h3>
            {statusCategories.map((cat) => (
              <a
                className="item"
                key={`item-progress-${categoryColorClass[cat]}`}
                id={`item-progress-${categoryColorClass[cat]}`}
                href={`#item-table-${categoryColorClass[cat]}`}
              >
                <Circle size="xxs" color={categoryColorClass[cat]} />
                {t(`status.${cat}`)} ({categoryCounts[cat]})
              </a>
            ))}
          </div>
          <div id="progress" className="column">
            <h3>{t("progress")}</h3>
            <ProgressBar key="all" id="all" data={progressBarData} spacing="small" />
          </div>
        </Progress>
        <article className={cls.statusArticle}>
          {election.committee_category === "GSB" && statuses.length === 0 && (
            <>
              {committeeSession.number === 1 && <p>{t("election_status.no_polling_stations")}</p>}
              {committeeSession.number > 1 && <p>{t("election_status.no_investigations_with_corrected_results")}</p>}
            </>
          )}
          {statuses.length > 0 &&
            tableCategories.map((cat) => (
              <div key={`item-table-${categoryColorClass[cat]}`} id={`item-table-${categoryColorClass[cat]}`}>
                <span className="item">
                  <Circle size="xs" color={categoryColorClass[cat]} />
                  <h3>
                    {t(`status.${cat}`)} <span className="normal">({categoryCounts[cat]})</span>
                  </h3>
                </span>
                <Table id={cat} key={cat} aria-label={t(`status.${cat}`)}>
                  <CategoryHeader category={cat} />
                  <Table.Body key={cat} className="fs-sm">
                    {sortTableRows(
                      cat,
                      statusEntriesWithTypist.filter((se) => statusesForCategory[cat].includes(se.entry.status)),
                    ).map((se) => (
                      <CategoryRow
                        key={`${cat}-${se.entry.source.type}-${se.entry.source.id}`}
                        category={cat}
                        statusEntryWithTypist={se}
                        addLink={addLinks}
                        warning={se.entry.finalised_with_warnings}
                      />
                    ))}
                  </Table.Body>
                </Table>
              </div>
            ))}
        </article>
      </div>
    </div>
  );
}
