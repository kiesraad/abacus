import { useEffect } from "react";
import { useNavigate } from "react-router";
import { NotFoundError } from "@/api/ApiResult";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t, tx } from "@/i18n/translate";
import type { Candidate, CandidateVotes, DeceasedCandidate } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import { apportionmentCheckStateAndRedirect, renderTitleAndHeader } from "../../utils/utils";
import cls from "../Apportionment.module.css";
import { ApportionmentErrorPage } from "../ApportionmentError";
import { CandidatesRankingTable } from "./CandidatesRankingTable";
import { CandidatesWithSeatTable } from "./CandidatesWithSeatTable";
import { CandidatesWithVotesTable } from "./CandidatesWithVotesTable";

interface PreferentiallyChosenCandidatesSectionProps {
  preferentialCandidateNomination: CandidateVotes[];
  preferenceThresholdPercentage: number;
  candidates: Candidate[];
}

function PreferentiallyChosenCandidatesSection({
  preferentialCandidateNomination,
  preferenceThresholdPercentage,
  candidates,
}: PreferentiallyChosenCandidatesSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.preferentially_chosen_candidates")}</h2>
        {preferentialCandidateNomination.length > 0 ? (
          <>
            <span id="text-preferentially-chosen-candidates" className={cls.tableInformation}>
              {t("apportionment.preferentially_chosen_candidates_info", {
                percentage: preferenceThresholdPercentage,
              })}
            </span>
            <CandidatesWithSeatTable
              id="preferentially-chosen-candidates-table"
              showPosition={false}
              showVotes={true}
              candidateList={candidates}
              candidateVotesList={preferentialCandidateNomination}
            />
          </>
        ) : (
          <span id="text-preferentially-chosen-candidates">
            {t("apportionment.preferentially_chosen_candidates_empty", {
              percentage: preferenceThresholdPercentage,
            })}
          </span>
        )}
      </div>
    </div>
  );
}

interface OtherChosenCandidatesSectionProps {
  otherCandidateNomination: CandidateVotes[];
  candidates: Candidate[];
  startSeatNumber: number;
}

function OtherChosenCandidatesSection({
  otherCandidateNomination,
  candidates,
  startSeatNumber,
}: OtherChosenCandidatesSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.other_chosen_candidates")}</h2>
        {otherCandidateNomination.length > 0 ? (
          <>
            <span id="text-other-chosen-candidates" className={cls.tableInformation}>
              {t("apportionment.other_chosen_candidates_info")}
            </span>
            <CandidatesWithSeatTable
              id="other-chosen-candidates-table"
              startSeatNumber={startSeatNumber}
              showPosition={true}
              showVotes={false}
              candidateList={candidates}
              candidateVotesList={otherCandidateNomination}
            />
          </>
        ) : (
          <span id="text-other-chosen-candidates">{t("apportionment.other_chosen_candidates_empty")}</span>
        )}
      </div>
    </div>
  );
}

interface UnelectedCandidatesRankingSectionProps {
  unelectedCandidatesRanking: Candidate[];
}

function UnelectedCandidatesRankingSection({ unelectedCandidatesRanking }: UnelectedCandidatesRankingSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.ranking_candidates")}</h2>
        {unelectedCandidatesRanking.length > 0 ? (
          <>
            <span id="text-ranking-candidates" className={cls.tableInformation}>
              {t("apportionment.ranking_candidates_info")}
            </span>
            <CandidatesRankingTable candidateRanking={unelectedCandidatesRanking} />
          </>
        ) : (
          <span id="text-ranking-candidates">{t("apportionment.ranking_candidates_empty")}</span>
        )}
      </div>
    </div>
  );
}

interface TotalVotesPerCandidateSectionProps {
  candidateVotesList: CandidateVotes[];
  candidates: Candidate[];
  deceasedCandidates: DeceasedCandidate[];
}

function TotalVotesPerCandidateSection({
  candidateVotesList,
  candidates,
  deceasedCandidates,
}: TotalVotesPerCandidateSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.total_number_votes_per_candidate")}</h2>
        <CandidatesWithVotesTable
          id="total-votes-per-candidate-table"
          candidateList={candidates}
          candidateVotesList={candidateVotesList}
          deceasedCandidatesList={deceasedCandidates}
        />
      </div>
    </div>
  );
}

export function ApportionmentListDetailsPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { seatAssignment, candidateNomination, electionSummary, error, state } = useApportionmentContext();
  const listNumber = useNumericParam("listNumber");

  useEffect(() => {
    apportionmentCheckStateAndRedirect(state, election.id, navigate);
  });

  const list = election.political_groups.find((group) => group.number === listNumber);

  if (!list) {
    throw new NotFoundError("error.not_found");
  }

  const listName = formatPoliticalGroupName(list);
  let listDeceasedCandidates: DeceasedCandidate[] = [];
  if (state?.type === "Finalised") {
    listDeceasedCandidates = state.deceased_candidates.filter((dc) => list.number === dc.pg_number);
  }

  if (error) {
    return <ApportionmentErrorPage sectionTitle={listName} error={error} />;
  }
  if (seatAssignment && candidateNomination && electionSummary) {
    const listTotalSeats = seatAssignment.final_standing.find(
      (standing) => standing.list_number === list.number,
    )?.total_seats;
    const candidateVotesList = electionSummary.political_group_votes.find(
      (pgv) => pgv.number === list.number,
    )?.candidate_votes;
    const listCandidateNomination = candidateNomination.list_candidate_nomination.find(
      (lcn) => lcn.list_number === list.number,
    );

    if (listTotalSeats !== undefined && candidateVotesList && listCandidateNomination) {
      let unelectedCandidatesRanking: Candidate[];
      if (listCandidateNomination.updated_candidate_ranking.length > 0) {
        unelectedCandidatesRanking = listCandidateNomination.updated_candidate_ranking.slice(listTotalSeats);
      } else {
        unelectedCandidatesRanking = list.candidates.slice(listTotalSeats);
      }
      return (
        <>
          {renderTitleAndHeader(listName)}
          <main>
            <article className={cls.article}>
              <div className={cn(cls.tableDiv, "mb-lg")}>
                <div>
                  <h2 className={cls.tableTitle}>{t("apportionment.assigned_number_of_seats")}</h2>
                  <span id="text-list-assigned-nr-seats">
                    {tx(
                      `apportionment.list_assigned_nr_seats.${listTotalSeats === 1 ? "singular" : "plural"}`,
                      {},
                      {
                        list_name: listName,
                        num_seats: listTotalSeats,
                      },
                    )}
                  </span>
                </div>
              </div>
              <PreferentiallyChosenCandidatesSection
                preferentialCandidateNomination={listCandidateNomination.preferential_candidate_nomination}
                preferenceThresholdPercentage={candidateNomination.preference_threshold.percentage}
                candidates={list.candidates}
              />
              <OtherChosenCandidatesSection
                otherCandidateNomination={listCandidateNomination.other_candidate_nomination}
                candidates={list.candidates}
                startSeatNumber={listCandidateNomination.preferential_candidate_nomination.length + 1}
              />
              <UnelectedCandidatesRankingSection unelectedCandidatesRanking={unelectedCandidatesRanking} />
              <TotalVotesPerCandidateSection
                candidates={list.candidates}
                candidateVotesList={candidateVotesList}
                deceasedCandidates={listDeceasedCandidates}
              />
            </article>
          </main>
        </>
      );
    }
  }
}
