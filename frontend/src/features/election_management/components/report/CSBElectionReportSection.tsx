import { t, tx } from "@/i18n/translate";
import type { Election } from "@/types/generated/openapi.ts";

export interface CSBElectionReportSectionProps {
  election: Election;
}

export function CSBElectionReportSection({ election }: CSBElectionReportSectionProps) {
  return (
    <>
      <p className="mb-md">{t("election_management.CSB.download_explanation")}</p>
      <p>
        <strong>
          {t("election_management.CSB.determination_election_results.download", {
            electionName: election.name,
          })}
          :
        </strong>
      </p>
      <ul>{tx("election_management.CSB.determination_election_results.explanation_text")}</ul>
      {/* Disabled for now: https://github.com/kiesraad/abacus/issues/2967 */}
      {/*<p>*/}
      {/*  <strong>*/}
      {/*    {t("election_management.CSB.p_22_2_attachment.download", {*/}
      {/*      electionName: election.name,*/}
      {/*    })}:*/}
      {/*  </strong>*/}
      {/*</p>*/}
      <ul>{tx("election_management.CSB.p_22_2_attachment.explanation_text")}</ul>
      <p>
        <strong>{t("election_management.CSB.definitive_documents.download", { electionName: election.name })}</strong>
      </p>
      <ul>{tx("election_management.CSB.definitive_documents.explanation_text")}</ul>
    </>
  );
}
