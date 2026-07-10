import { useEffect } from "react";
import { useNavigate } from "react-router";
import { NotFoundError } from "@/api/ApiResult";
import { Alert } from "@/components/ui/Alert/Alert";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t, tx } from "@/i18n/translate";
import type { Candidate, CandidateVotes, ListCandidateNomination, PoliticalGroup } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import { formatList } from "@/utils/strings";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import {
  apportionmentCheckStateAndRedirect,
  getListCandidatesDrawn,
  type ListCandidateDrawn,
  renderTitleAndHeader,
} from "../../utils/utils";
import cls from "../Apportionment.module.css";
import { ApportionmentErrorPage } from "../ApportionmentError";
import { CandidatesRankingTable } from "./CandidatesRankingTable";
import { CandidatesWithSeatTable } from "./CandidatesWithSeatTable";
import { CandidatesWithVotesTable } from "./CandidatesWithVotesTable";

function getListAssignedSeatsText(listTotalSeats: number, listName: string) {
  return tx(
    `apportionment.list_assigned_nr_seats.${listTotalSeats === 1 ? "singular" : "plural"}`,
    {},
    {
      list_name: listName,
      num_seats: listTotalSeats,
    },
  );
}

function renderDeceasedCandidatesAlert(listDeceasedCandidateNumbers: number[]) {
  return (
    <Alert type="notify" small>
      <p>
        {listDeceasedCandidateNumbers.length === 1
          ? t("apportionment.list_details_alert.deceased_candidate", {
              nr: formatList(listDeceasedCandidateNumbers, t("and")),
            })
          : t("apportionment.list_details_alert.deceased_candidates", {
              nrs: formatList(listDeceasedCandidateNumbers, t("and")),
            })}
        <br />
        {t("apportionment.list_details_alert.votes_have_been_counted_on_the_list")}
      </p>
    </Alert>
  );
}

function renderNotifyDrawingLotsAlert(listCandidatesDrawn: ListCandidateDrawn[]) {
  return (
    <div className={cn(cls.smallAlert, "mb-md-lg")}>
      <Alert type="notify" small>
        {listCandidatesDrawn.length === 1 ? (
          <p>
            {listCandidatesDrawn.map(({ seat_number, candidate, options }) => (
              <span key={`drawing-lots-assignment-${seat_number}`}>
                {tx("apportionment.assigned_by_drawing_lots_to_candidate_alert.singular", undefined, {
                  seat_number: seat_number,
                  candidate: candidate,
                  options: formatList(options, t("and")),
                })}
              </span>
            ))}
          </p>
        ) : (
          listCandidatesDrawn.length > 1 && (
            <>
              <p>{t("apportionment.assigned_by_drawing_lots_to_candidate_alert.plural.title")}</p>
              <ul>
                {listCandidatesDrawn.map(({ seat_number, candidate, options }) => (
                  <li key={`drawing-lots-assignment-${seat_number}`}>
                    {tx("apportionment.assigned_by_drawing_lots_to_candidate_alert.plural.assigned_to", undefined, {
                      seat_number: seat_number,
                      candidate: candidate,
                      options: formatList(options, t("and")),
                    })}
                  </li>
                ))}
              </ul>
            </>
          )
        )}
      </Alert>
    </div>
  );
}

interface PreferentiallyChosenCandidatesSectionProps {
  preferentialCandidateNomination: CandidateVotes[];
  preferenceThresholdPercentage: number;
  candidates: Candidate[];
  listCandidatesDrawn: ListCandidateDrawn[] | undefined;
}

function PreferentiallyChosenCandidatesSection({
  preferentialCandidateNomination,
  preferenceThresholdPercentage,
  candidates,
  listCandidatesDrawn,
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
            {listCandidatesDrawn !== undefined &&
              listCandidatesDrawn.length > 0 &&
              renderNotifyDrawingLotsAlert(listCandidatesDrawn)}
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
  deceasedCandidateNumbers: number[];
}

function TotalVotesPerCandidateSection({
  candidateVotesList,
  candidates,
  deceasedCandidateNumbers,
}: TotalVotesPerCandidateSectionProps) {
  return (
    <div className={cn(cls.tableDiv, "mb-lg")}>
      <div>
        <h2 className={cls.tableTitle}>{t("apportionment.total_number_votes_per_candidate")}</h2>
        <CandidatesWithVotesTable
          id="total-votes-per-candidate-table"
          candidateList={candidates}
          candidateVotesList={candidateVotesList}
          deceasedCandidateNumbersList={deceasedCandidateNumbers}
        />
      </div>
    </div>
  );
}

function getUnelectedCandidatesRanking(
  listCandidateNomination: ListCandidateNomination,
  listTotalSeats: number,
  list: PoliticalGroup,
): Candidate[] {
  if (listCandidateNomination.updated_candidate_ranking.length > 0) {
    return listCandidateNomination.updated_candidate_ranking.slice(listTotalSeats);
  } else {
    return list.candidates.slice(listTotalSeats);
  }
}

export function ApportionmentListDetailsPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { seatAssignment, candidateNomination, electionSummary, error, state } = useApportionmentContext();
  const listNumber = useNumericParam("listNumber");

  useEffect(() => {
    apportionmentCheckStateAndRedirect(state, election.id, navigate);
    if (state?.type === "DrawingLots") {
      void navigate(`/elections/${election.id}/apportionment`);
    }
  });

  const list = election.political_groups.find((group) => group.number === listNumber);

  if (!list) {
    throw new NotFoundError("error.not_found");
  }

  const listName = formatPoliticalGroupName(list);
  let listDeceasedCandidateNumbers: number[] = [];
  if (state?.type === "Finalised") {
    listDeceasedCandidateNumbers = state.deceased_candidates
      .filter((dc) => list.number === dc.pg_number)
      .map((dc) => dc.candidate_number);
  }

  if (error) {
    return <ApportionmentErrorPage sectionTitle={listName} error={error} />;
  }
  if (seatAssignment && candidateNomination && electionSummary) {
    const listTotalSeats = seatAssignment.standings.find(
      (standing) => standing.list_number === list.number,
    )?.total_seats;
    const candidateVotesList = electionSummary.political_group_votes.find(
      (pgv) => pgv.number === list.number,
    )?.candidate_votes;
    const listCandidateNomination = candidateNomination.list_candidate_nomination.find(
      (lcn) => lcn.list_number === list.number,
    );

    if (listTotalSeats !== undefined && candidateVotesList && listCandidateNomination && state) {
      const listCandidatesDrawn = getListCandidatesDrawn(state, list);
      const unelectedCandidatesRanking = getUnelectedCandidatesRanking(listCandidateNomination, listTotalSeats, list);
      return (
        <>
          {renderTitleAndHeader(listName)}
          <main>
            <article className={cls.article}>
              <div className={cn(cls.tableDiv, "mb-lg")}>
                <div>
                  <div>
                    <h2 className={cls.tableTitle}>{t("apportionment.assigned_number_of_seats")}</h2>
                    <span id="text-list-assigned-nr-seats">{getListAssignedSeatsText(listTotalSeats, listName)}</span>
                  </div>
                  {listDeceasedCandidateNumbers.length > 0 && (
                    <div className={cn("mt-md-lg", cls.smallAlert)}>
                      {renderDeceasedCandidatesAlert(listDeceasedCandidateNumbers.sort((a, b) => a - b))}
                    </div>
                  )}
                </div>
              </div>
              <PreferentiallyChosenCandidatesSection
                preferentialCandidateNomination={listCandidateNomination.preferential_candidate_nomination}
                preferenceThresholdPercentage={candidateNomination.preference_threshold.percentage}
                candidates={list.candidates}
                listCandidatesDrawn={listCandidatesDrawn}
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
                deceasedCandidateNumbers={listDeceasedCandidateNumbers}
              />
            </article>
          </main>
        </>
      );
    }
  }
}
