import { ApplicationError } from "@/api/ApiResult";
import { DownloadButton } from "@/components/ui/DownloadButton/DownloadButton";
import { Loader } from "@/components/ui/Loader/Loader";
import { useApportionmentStateRequest } from "@/hooks/apportionment/useApportionmentStateRequest";
import { t, tx } from "@/i18n/translate";
import type { CommitteeSession, Election } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatDateTimeFull } from "@/utils/dateTime";

import cls from "../ElectionManagement.module.css";

interface CSBElectionReportSectionProps {
  election: Election;
  committeeSession: CommitteeSession;
  sessionLabel: string;
}

export function CSBElectionReportSection({ election, committeeSession, sessionLabel }: CSBElectionReportSectionProps) {
  const { error, data: apportionmentState } = useApportionmentStateRequest(election.id);

  if (error) {
    throw error;
  }
  if (!apportionmentState) {
    return <Loader />;
  }
  if (apportionmentState.type !== "Finalised") {
    throw new ApplicationError(t("error.forbidden_message"), "InvalidCommitteeSessionStatus");
  }

  return (
    <>
      <h2 className="form_title">
        {t("apportionment.title")} {t("municipality").toLowerCase()} {election.location}
      </h2>
      <div className={cls.reportInfoSection}>
        {t("election_report.committee_session_started", {
          date_time: committeeSession.start_date_time
            ? formatDateTimeFull(new Date(committeeSession.start_date_time))
            : "",
        })}
        .
        <DownloadButton
          icon="download"
          href={`/api/elections/${election.id}/committee_sessions/${committeeSession.id}/download_zip_results_csb`}
          title={t("election_management.CSB.determination_election_results.download")}
          subtitle={t("election_management.zip_file")}
        />
        <DownloadButton
          icon="download"
          href={`/api/elections/${election.id}/committee_sessions/${committeeSession.id}/download_zip_attachment_csb`}
          title={t("election_management.CSB.p_22_2_attachment.download")}
          subtitle={t("election_management.zip_file")}
        />
        <DownloadButton
          icon="download"
          href={`/api/elections/${election.id}/committee_sessions/${committeeSession.id}/download_zip_total_counts_csb`}
          title={t(`election_management.CSB.download_definitive_documents`, {
            sessionLabel: sessionLabel.toLowerCase(),
          })}
          subtitle={t("election_management.zip_file")}
        />
      </div>
      <section className={cn(cls.reportInfoSection, "sm")}>
        <h3>{t("election_management.what_now")}?</h3>
        <p>{t(`election_management.CSB.download_definitive_files`)}</p>
        <section className="sm">
          <p className="mb-md">{t("election_management.CSB.download_explanation")}</p>
          <p>
            <strong>
              {t("election_management.CSB.determination_election_results.download", {
                electionName: election.name,
              })}
            </strong>
          </p>
          <ul>{tx("election_management.CSB.determination_election_results.explanation_text")}</ul>
          <p>
            <strong>{t("election_management.CSB.p_22_2_attachment.download", { electionName: election.name })}</strong>
          </p>
          <ul>{tx("election_management.CSB.p_22_2_attachment.explanation_text")}</ul>
          <p>
            <strong>
              {t("election_management.CSB.definitive_documents.download", { electionName: election.name })}
            </strong>
          </p>
          <ul>{tx("election_management.CSB.definitive_documents.explanation_text")}</ul>
          <p>{t(`election_management.CSB.upload_the_zip`)}</p>
        </section>
      </section>
    </>
  );
}
