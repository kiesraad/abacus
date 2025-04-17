import { Link } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/lib/i18n";

import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import cls from "../Apportionment.module.css";
import { ApportionmentError } from "../ApportionmentError";
import { FullSeatsTable } from "./FullSeatsTable";
import { ResidualSeatsCalculationTable } from "./ResidualSeatsCalculationTable";

export function ApportionmentFullSeatsPage() {
  const { election } = useElection();
  const { seatAssignment, error } = useApportionmentContext();

  return (
    <>
      <PageTitle title={`${t("apportionment.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("apportionment.details_full_seats")}</h1>
        </section>
      </header>
      <main>
        <article className={cls.article}>
          {error ? (
            <ApportionmentError error={error} />
          ) : (
            seatAssignment && (
              <>
                <div>
                  <h2 className={cls.tableTitle}>{t("apportionment.how_often_is_quota_met")}</h2>
                  <span className={cls.tableInformation}>{t("apportionment.full_seats_information")}</span>
                  <FullSeatsTable
                    finalStanding={seatAssignment.final_standing}
                    politicalGroups={election.political_groups}
                    quota={seatAssignment.quota}
                  />
                </div>

                <div>
                  <h2 className={cls.tableTitle}>{t("apportionment.how_many_residual_seats")}</h2>
                  <span className={cls.tableInformation}>
                    {tx(
                      `apportionment.residual_seats_information_amount_and_link.${seatAssignment.residual_seats === 1 ? "singular" : "plural"}`,
                      {
                        link: (title) => <Link to="../details-residual-seats">{title}</Link>,
                      },
                      { num_residual_seats: seatAssignment.residual_seats },
                    )}{" "}
                    {t(
                      `apportionment.residual_seats_information_${seatAssignment.seats >= 19 ? "highest_averages" : "largest_remainders"}`,
                    )}
                  </span>
                  <ResidualSeatsCalculationTable
                    seats={seatAssignment.seats}
                    fullSeats={seatAssignment.full_seats}
                    residualSeats={seatAssignment.residual_seats}
                  />
                </div>
              </>
            )
          )}
        </article>
      </main>
    </>
  );
}
