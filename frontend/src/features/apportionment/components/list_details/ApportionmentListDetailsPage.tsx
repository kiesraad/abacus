import { useParams } from "react-router";

import { NotFoundError, useElection } from "@/api";
import { PageTitle } from "@/components/ui";
import { t, tx } from "@/lib/i18n";

import { parseIntStrict } from "@kiesraad/util";

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
  const { pgNumber } = useParams();

  if (!pgNumber) {
    throw new Error("Missing 'pgNumber' parameter");
  }

  const parsedPgNumber = parseIntStrict(pgNumber);
  const pg = election.political_groups.find((group) => group.number === parsedPgNumber);

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
    if (pgTotalSeats && candidateVotesList && pgCandidateNomination) {
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
                  <span>
                    {tx(
                      `apportionment.political_group_assigned_nr_seats.${pgTotalSeats > 1 ? "plural" : "singular"}`,
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
                      <span className={cls.tableInformation}>
                        {t("apportionment.preferentially_chosen_candidates_info", {
                          percentage: candidateNomination.preference_threshold.percentage,
                        })}
                      </span>
                      <CandidatesWithVotesTable
                        id="preferentially_chosen_candidates_table"
                        showNumber={false}
                        showLocality={true}
                        candidateList={pg.candidates}
                        candidateVotesList={preferentialCandidateNomination}
                      />
                    </>
                  ) : (
                    <span>{t("apportionment.preferentially_chosen_candidates_empty")}</span>
                  )}
                </div>
                <div>
                  <h2 className={cls.tableTitle}>{t("apportionment.other_chosen_candidates")}</h2>
                  {otherCandidateNomination.length > 0 ? (
                    <>
                      <span className={cls.tableInformation}>{t("apportionment.other_chosen_candidates_info")}</span>
                      <CandidatesWithVotesTable
                        id="other_chosen_candidates_table"
                        showNumber={false}
                        showLocality={true}
                        candidateList={pg.candidates}
                        candidateVotesList={otherCandidateNomination}
                      />
                    </>
                  ) : (
                    <span>{t("apportionment.other_chosen_candidates_empty")}</span>
                  )}
                </div>
                <div>
                  <h2 className={cls.tableTitle}>{t("apportionment.ranking_candidates")}</h2>
                  {updatedCandidateRanking.length > 0 ? (
                    <>
                      <span className={cls.tableInformation}>{t("apportionment.ranking_candidates_info")}</span>
                      <CandidatesRankingTable candidateRanking={updatedCandidateRanking} />
                    </>
                  ) : (
                    <span>{t("apportionment.ranking_candidates_empty")}</span>
                  )}
                </div>
                <div>
                  <h2 className={cls.tableTitle}>{t("apportionment.total_number_votes_per_candidate")}</h2>
                  <CandidatesWithVotesTable
                    id="total_votes_per_candidate_table"
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
