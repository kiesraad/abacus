import { Link } from "react-router";

import { useElection } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { Alert, FormLayout, PageTitle } from "@kiesraad/ui";

import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import cls from "../Apportionment.module.css";
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
            <FormLayout.Alert>
              <Alert type="error">
                <h2>{t("apportionment.not_available")}</h2>
                <p>{t(`error.api_error.${error.reference}`)}</p>
              </Alert>
            </FormLayout.Alert>
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
                      `apportionment.residual_seats_information_amount_and_link.${seatAssignment.residual_seats > 1 ? "plural" : "singular"}`,
                      {
                        link: (title) => <Link to="../details-residual-seats">{title}</Link>,
                      },
                      { num_residual_seats: seatAssignment.residual_seats },
                    )}{" "}
                    {t(
                      `apportionment.residual_seats_information_largest_${seatAssignment.seats >= 19 ? "averages" : "remainders"}`,
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
