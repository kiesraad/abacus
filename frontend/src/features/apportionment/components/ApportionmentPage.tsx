import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { type AnyApiError, type ApiResult, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import type { ApportionmentState, REGISTER_DECEASED_CANDIDATES_REQUEST_PATH } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { getNumberOfCandidates } from "@/utils/politicalGroups";
import { useApportionmentContext } from "../hooks/useApportionmentContext";
import { apportionmentCheckStateAndRedirect, renderTitleAndHeader } from "../utils/utils";
import cls from "./Apportionment.module.css";
import { ApportionmentError } from "./ApportionmentError";
import { ApportionmentTable } from "./ApportionmentTable";
import { ChosenCandidatesTable } from "./ChosenCandidatesTable";
import { type DeceasedCandidatesInfo, ElectionSummaryTable } from "./ElectionSummaryTable";

function getNumberOfSeatsAssignedSentence(seats: number, type: "residual_seat" | "full_seat"): string {
  return t(`apportionment.seats_assigned.${seats === 1 ? "singular" : "plural"}`, {
    num_seat: seats,
    type_seat: t(`apportionment.${type}.singular`).toLowerCase(),
  });
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO: Can this be shortened?
export function ApportionmentPage() {
  const navigate = useNavigate();
  const { currentCommitteeSession, election } = useElection();
  const { seatAssignment, candidateNomination, electionSummary, state, error, refetchState } =
    useApportionmentContext();
  const [apiError, setApiError] = useState<AnyApiError>();
  const client = useApiClient();

  if (apiError) {
    throw apiError;
  }

  useEffect(() => {
    apportionmentCheckStateAndRedirect(state, election.id, navigate);
  });

  const unassignedSeats = seatAssignment
    ? seatAssignment.seats - seatAssignment.full_seats - seatAssignment.residual_seats
    : 0;

  async function RegisterDeceasedCandidates() {
    const path: REGISTER_DECEASED_CANDIDATES_REQUEST_PATH = `/api/elections/${election.id}/apportionment/register_deceased_candidates`;
    const response: ApiResult<ApportionmentState> = await client.postRequest(path);

    if (isSuccess(response)) {
      void refetchState();
    } else {
      setApiError(response);
    }
  }

  return (
    <>
      {renderTitleAndHeader(t("apportionment.title"))}
      <main>
        <article className={cls.article}>
          {error ? (
            <ApportionmentError error={error} />
          ) : (
            seatAssignment &&
            candidateNomination &&
            electionSummary &&
            state?.type === "Finalised" && (
              <>
                <FormLayout.Alert>
                  <Alert type={unassignedSeats > 0 ? "warning" : "success"}>
                    <strong className="heading-md">
                      {t(
                        unassignedSeats > 0
                          ? "apportionment.not_all_seats_assigned"
                          : "apportionment.all_seats_assigned",
                      )}
                    </strong>
                    <p>{t("apportionment.make_apportionment_definitive")}</p>
                    <Button.Link to={`../report/committee-session/${currentCommitteeSession.id}/download`} size="md">
                      {t("election_management.to_report")}
                    </Button.Link>
                  </Alert>
                </FormLayout.Alert>
                <div className={cn(cls.tableDiv, "mb-lg")}>
                  <div>
                    <h2 className={cls.tableTitle}>{t("apportionment.election_summary")}</h2>
                    <ElectionSummaryTable
                      votesCounts={electionSummary.votes_counts}
                      seats={seatAssignment.seats}
                      quota={seatAssignment.quota}
                      numberOfVoters={electionSummary.number_of_voters}
                      preferenceThreshold={candidateNomination.preference_threshold}
                      deceasedCandidatesInfo={
                        {
                          numberOfCandidates: getNumberOfCandidates(election.political_groups),
                          numberOfDeceasedCandidates: state.deceased_candidates.length,
                          registerDeceasedCandidates: () => void RegisterDeceasedCandidates(),
                        } satisfies DeceasedCandidatesInfo
                      }
                    />
                  </div>
                </div>
                <div className={cn(cls.tableDiv, "mb-lg")}>
                  <div>
                    <h2 className={cls.tableTitle}>{t("apportionment.title")}</h2>
                    <ApportionmentTable
                      finalStanding={seatAssignment.final_standing}
                      politicalGroups={election.political_groups}
                      fullSeats={seatAssignment.full_seats}
                      residualSeats={seatAssignment.residual_seats}
                      seats={seatAssignment.seats}
                    />
                  </div>
                  <div className={cls.footnoteDiv}>
                    <ul>
                      <li>
                        {getNumberOfSeatsAssignedSentence(seatAssignment.full_seats, "full_seat")} (
                        <Link to="./details-full-seats">{t("apportionment.view_details")}</Link>)
                      </li>
                      <li>
                        {getNumberOfSeatsAssignedSentence(seatAssignment.residual_seats, "residual_seat")} (
                        <Link to="./details-residual-seats">{t("apportionment.view_details")}</Link>)
                      </li>
                    </ul>
                  </div>
                </div>
                <div className={cn(cls.tableDiv, "mb-lg")}>
                  <div>
                    <h2 className={cls.tableTitle}>{t("apportionment.chosen_candidates")}</h2>
                    <span className={cls.tableInformation}>{t("apportionment.in_alphabetical_order")}</span>
                    <ChosenCandidatesTable chosenCandidates={candidateNomination.chosen_candidates} />
                  </div>
                </div>
              </>
            )
          )}
        </article>
      </main>
    </>
  );
}
