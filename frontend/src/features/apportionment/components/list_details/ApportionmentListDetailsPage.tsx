import { NotFoundError } from "@/api/ApiResult";
import { useElection } from "@/api/election/useElection";
import { PageTitle } from "@/components/ui";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t, tx } from "@/lib/i18n";

import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import cls from "../Apportionment.module.css";
import { ApportionmentError } from "../ApportionmentError";
import { CandidatesRankingTable } from "./CandidatesRankingTable";
import { CandidatesWithVotesTable } from "./CandidatesWithVotesTable";

function render_title_and_header(pgName: string) {
  return (
    <>
      <PageTitle title={`${t("apportionment.title")} - Abacus`} />
      <header>
        <section>
          <h1>{pgName}</h1>
        </section>
      </header>
    </>
  );
}

export function ApportionmentListDetailsPage() {
  const { election } = useElection();
  const { seatAssignment, candidateNomination, electionSummary, error } = useApportionmentContext();
  const pgNumber = useNumericParam("pgNumber");

  const pg = election.political_groups.find((group) => group.number === pgNumber);

  if (!pg) {
    throw new NotFoundError("error.not_found");
  }

  const pgName = `${t("list")} ${pg.number} - ${pg.name}`;

  if (error) {
    return (
      <>
        {render_title_and_header(pgName)}
        <main>
          <article>
            <ApportionmentError error={error} />
          </article>
        </main>
      </>
    );
  }
  if (seatAssignment && candidateNomination && electionSummary) {
    const pgTotalSeats = seatAssignment.final_standing[pg.number - 1]?.total_seats;
    const candidateVotesList = electionSummary.political_group_votes[pg.number - 1]?.candidate_votes;
    const pgCandidateNomination = candidateNomination.political_group_candidate_nomination[pg.number - 1];

    if (pgTotalSeats !== undefined && candidateVotesList && pgCandidateNomination) {
      const updatedCandidateRanking = pgCandidateNomination.updated_candidate_ranking;
      const preferentialCandidateNomination = pgCandidateNomination.preferential_candidate_nomination;
      const otherCandidateNomination = pgCandidateNomination.other_candidate_nomination;

      return (
        <>
          {render_title_and_header(pgName)}
          <main>
            <article className={cls.article}>
              <>
                <div>
                  <h2 className={cls.tableTitle}>{t("apportionment.assigned_number_of_seats")}</h2>
                  <span id="text-political-group-assigned-nr-seats">
                    {tx(
                      `apportionment.political_group_assigned_nr_seats.${pgTotalSeats === 1 ? "singular" : "plural"}`,
                      {},
                      {
                        pg_name: pgName,
                        num_seats: pgTotalSeats,
                      },
                    )}
                  </span>
                </div>
                <div>
                  <h2 className={cls.tableTitle}>{t("apportionment.preferentially_chosen_candidates")}</h2>
                  {preferentialCandidateNomination.length > 0 ? (
                    <>
                      <span id="text-preferentially-chosen-candidates" className={cls.tableInformation}>
                        {t("apportionment.preferentially_chosen_candidates_info", {
                          percentage: candidateNomination.preference_threshold.percentage,
                        })}
                      </span>
                      <CandidatesWithVotesTable
                        id="preferentially-chosen-candidates-table"
                        showNumber={false}
                        showLocality={true}
                        candidateList={pg.candidates}
                        candidateVotesList={preferentialCandidateNomination}
                      />
                    </>
                  ) : (
                    <span id="text-preferentially-chosen-candidates">
                      {t("apportionment.preferentially_chosen_candidates_empty", {
                        percentage: candidateNomination.preference_threshold.percentage,
                      })}
                    </span>
                  )}
                </div>
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
                        candidateList={pg.candidates}
                        candidateVotesList={otherCandidateNomination}
                      />
                    </>
                  ) : (
                    <span id="text-other-chosen-candidates">{t("apportionment.other_chosen_candidates_empty")}</span>
                  )}
                </div>
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
                <div>
                  <h2 className={cls.tableTitle}>{t("apportionment.total_number_votes_per_candidate")}</h2>
                  <CandidatesWithVotesTable
                    id="total-votes-per-candidate-table"
                    showNumber={true}
                    showLocality={false}
                    candidateList={pg.candidates}
                    candidateVotesList={candidateVotesList}
                  />
                </div>
              </>
            </article>
          </main>
        </>
      );
    }
  }
}
