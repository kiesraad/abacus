import { NotFoundError } from "@/api/ApiResult";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t, tx } from "@/i18n/translate";
import type { Candidate, CandidateVotes } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import { render_title_and_header } from "../../utils/utils";
import cls from "../Apportionment.module.css";
import { ApportionmentErrorPage } from "../ApportionmentError";
import { CandidatesRankingTable } from "./CandidatesRankingTable";
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
            <CandidatesWithVotesTable
              id="preferentially-chosen-candidates-table"
              showNumber={false}
              showLocality={true}
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
}

function OtherChosenCandidatesSection({ otherCandidateNomination, candidates }: OtherChosenCandidatesSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.other_chosen_candidates")}</h2>
        {otherCandidateNomination.length > 0 ? (
          <>
            <span id="text-other-chosen-candidates" className={cls.tableInformation}>
              {t("apportionment.other_chosen_candidates_info")}
            </span>
            <CandidatesWithVotesTable
              id="other-chosen-candidates-table"
              showNumber={false}
              showLocality={true}
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

interface UpdatedCandidateRankingSectionProps {
  updatedCandidateRanking: Candidate[];
}

function UpdatedCandidateRankingSection({ updatedCandidateRanking }: UpdatedCandidateRankingSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.ranking_candidates")}</h2>
        {updatedCandidateRanking.length > 0 ? (
          <>
            <span id="text-ranking-candidates" className={cls.tableInformation}>
              {t("apportionment.ranking_candidates_info")}
            </span>
            <CandidatesRankingTable candidateRanking={updatedCandidateRanking} />
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
}

function TotalVotesPerCandidateSection({ candidateVotesList, candidates }: TotalVotesPerCandidateSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.total_number_votes_per_candidate")}</h2>
        <CandidatesWithVotesTable
          id="total-votes-per-candidate-table"
          showNumber={true}
          showLocality={false}
          candidateList={candidates}
          candidateVotesList={candidateVotesList}
        />
      </div>
    </div>
  );
}

export function ApportionmentListDetailsPage() {
  const { election } = useElection();
  const { seatAssignment, candidateNomination, electionSummary, error } = useApportionmentContext();
  const listNumber = useNumericParam("listNumber");

  const list = election.political_groups.find((group) => group.number === listNumber);

  if (!list) {
    throw new NotFoundError("error.not_found");
  }

  const listName = formatPoliticalGroupName(list);

  if (error) {
    return <ApportionmentErrorPage sectionTitle={listName} error={error} />;
  }
  if (seatAssignment && candidateNomination && electionSummary) {
    const listTotalSeats = seatAssignment.final_standing[list.number - 1]?.total_seats;
    const candidateVotesList = electionSummary.political_group_votes[list.number - 1]?.candidate_votes;
    const listCandidateNomination = candidateNomination.list_candidate_nomination[list.number - 1];

    if (listTotalSeats !== undefined && candidateVotesList && listCandidateNomination) {
      return (
        <>
          {render_title_and_header(listName)}
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
              />
              <UpdatedCandidateRankingSection
                updatedCandidateRanking={listCandidateNomination.updated_candidate_ranking}
              />
              <TotalVotesPerCandidateSection candidates={list.candidates} candidateVotesList={candidateVotesList} />
            </article>
          </main>
        </>
      );
    }
  }
}
