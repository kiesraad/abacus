import { DownloadButton } from "@/components/ui/DownloadButton/DownloadButton";
import { Loader } from "@/components/ui/Loader/Loader";
import { t, tx } from "@/i18n/translate";
import type { CommitteeSession, Election } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatDateTimeFull } from "@/utils/dateTime";

import { useCommitteeSessionInvestigationListRequest } from "../../hooks/useCommitteeSessionInvestigationListRequest";
import cls from "../ElectionManagement.module.css";

interface GSBElectionReportSectionProps {
  election: Election;
  committeeSession: CommitteeSession;
  sessionLabel: string;
}

export function GSBElectionReportSection({ election, committeeSession, sessionLabel }: GSBElectionReportSectionProps) {
  const { requestState } = useCommitteeSessionInvestigationListRequest(election.id, committeeSession.id);

  if (requestState.status === "loading") {
    return <Loader />;
  }
  if ("error" in requestState) {
    throw requestState.error;
  }

  const isFirstCommitteeSession = committeeSession.number === 1;
  const wasCorrected = requestState.data.investigations.some((i) => i.corrected_results);
  const formTitle = `
    ${t("election_report.counting_results")} ${sessionLabel.toLowerCase()} 
    ${t(`committee_category.GSB.short`).toLowerCase()} ${t("municipality").toLowerCase()} 
    ${election.location}
  `;

  return (
    <>
      <h2 className="form_title">{formTitle}</h2>
      <div className={cls.reportInfoSection}>
        {t("election_report.committee_session_started", {
          date_time: committeeSession.start_date_time
            ? formatDateTimeFull(new Date(committeeSession.start_date_time))
            : "",
        })}
        .
        {election.counting_method && (
          <>
            <br />
            {t("election_report.there_was_counting_method", {
              method: t(election.counting_method).toLowerCase(),
            })}
            .
          </>
        )}
        <DownloadButton
          icon="download"
          href={`/api/elections/${election.id}/committee_sessions/${committeeSession.id}/download_zip_results`}
          title={t(`election_management.GSB.download_definitive_documents`, {
            sessionLabel: sessionLabel.toLowerCase(),
          })}
          subtitle={t("election_management.zip_file")}
        />
      </div>
      <section className={cn(cls.reportInfoSection, "sm")}>
        <h3>{t("election_management.what_now")}?</h3>
        <p>{t(`election_management.GSB.download_definitive_files`)}</p>
        <section className="sm">
          <p>{t("election_management.zip_file_explanation")}</p>
          <ol>
            {tx(
              isFirstCommitteeSession
                ? "election_management.GSB.first_session.documents"
                : wasCorrected
                  ? "election_management.GSB.next_session.with_corrections.documents"
                  : "election_management.GSB.next_session.without_corrections.documents",
            )}
          </ol>
          <p>{t(`election_management.GSB.upload_the_zip`)}</p>
        </section>
      </section>
    </>
  );
}
