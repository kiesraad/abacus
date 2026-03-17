import { t, tx } from "@/i18n/translate";
import type { CommitteeSession, Election } from "@/types/generated/openapi.ts";
import { cn } from "@/utils/classnames";
import cls from "../ElectionManagement.module.css";

export interface ElectionReportSectionProps {
  election: Election;
  committeeSession: CommitteeSession;
  wasCorrected: boolean;
}

export function ElectionReportSection({ election, committeeSession, wasCorrected }: ElectionReportSectionProps) {
  const isFirstCommitteeSession = committeeSession.number === 1;

  return (
    <section className={cn(cls.reportInfoSection, "sm")}>
      <h3>{t("election_management.what_now")}?</h3>
      <p>{t(`election_management.${election.committee_category}.download_definitive_files`)}</p>
      <section className="sm">
        {election.committee_category === "GSB" && (
          <>
            <p>
              {t(
                isFirstCommitteeSession
                  ? "election_management.GSB.first_session.zip_file_explanation"
                  : wasCorrected
                    ? "election_management.GSB.next_session.with_corrections.zip_file_explanation"
                    : "election_management.GSB.next_session.without_corrections.zip_file_explanation",
              )}
            </p>
            <ol>
              {tx(
                isFirstCommitteeSession
                  ? "election_management.GSB.first_session.documents"
                  : wasCorrected
                    ? "election_management.GSB.next_session.with_corrections.documents"
                    : "election_management.GSB.next_session.without_corrections.documents",
              )}
            </ol>
          </>
        )}
        {election.committee_category === "CSB" && (
          <>
            <p className="mb-md">{t("election_management.CSB.download_explanation")}</p>
            <p>
              <strong>
                {t("election_management.CSB.determination_election_results.explanation_title", {
                  electionName: election.name,
                })}
              </strong>
            </p>
            <ul>{tx("election_management.CSB.determination_election_results.explanation_text")}</ul>
            <p>
              <strong>
                {t("election_management.CSB.p_22_2_attachment.explanation_title", {
                  electionName: election.name,
                })}
              </strong>
            </p>
            <ul>{tx("election_management.CSB.p_22_2_attachment.explanation_text")}</ul>
            <p>
              <strong>
                {t("election_management.CSB.definitive_documents.download", { electionName: election.name })}
              </strong>
            </p>
            <ul>{tx("election_management.CSB.definitive_documents.explanation_text")}</ul>
          </>
        )}
        <p>{t(`election_management.${election.committee_category}.upload_the_zip`)}</p>
      </section>
    </section>
  );
}
