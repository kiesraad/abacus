import { Link } from "react-router";

import {
  LargestAveragesFor19OrMoreSeatsTable,
  LargestAveragesForLessThan19SeatsTable,
  LargestSurplusesTable,
} from "app/component/apportionment";

import { useApportionmentContext, useElection } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { Alert, FormLayout, PageTitle } from "@kiesraad/ui";

import cls from "./Apportionment.module.css";

function render_title_and_header() {
  return (
    <>
      <PageTitle title={`${t("apportionment.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("apportionment.details_residual_seats")}</h1>
        </section>
      </header>
    </>
  );
}

function render_information(seats: number, residual_seats: number) {
  return (
    <span className={cls.tableInformation}>
      {tx(
        `apportionment.whole_seats_information_link.${residual_seats > 1 ? "plural" : "singular"}`,
        {
          link: (title) => <Link to="../details-whole-seats">{title}</Link>,
        },
        { num_residual_seats: residual_seats },
      )}
      <br />
      <br />
      {tx(`apportionment.information_largest_${seats >= 19 ? "averages" : "surpluses"}`)}
    </span>
  );
}

export function ApportionmentResidualSeatsPage() {
  const { election } = useElection();
  const { apportionment, error } = useApportionmentContext();

  if (error) {
    return (
      <>
        {render_title_and_header()}
        <main>
          <article>
            <FormLayout.Alert>
              <Alert type="error">
                <h2>{t("apportionment.not_available")}</h2>
                <p>{t(`error.api_error.${error.reference}`)}</p>
              </Alert>
            </FormLayout.Alert>
          </article>
        </main>
      </>
    );
  }
  if (apportionment) {
    const highest_surplus_steps = apportionment.steps.filter((step) => step.change.assigned_by === "HighestSurplus");
    const highest_average_steps = apportionment.steps.filter((step) => step.change.assigned_by === "HighestAverage");
    return (
      <>
        {render_title_and_header()}
        <main>
          <article className={cls.article}>
            {apportionment.residual_seats > 0 ? (
              apportionment.seats >= 19 ? (
                <div>
                  <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_largest_averages")}</h2>
                  {render_information(apportionment.seats, apportionment.residual_seats)}
                  {highest_average_steps.length > 0 && (
                    <LargestAveragesFor19OrMoreSeatsTable
                      highest_average_steps={highest_average_steps}
                      final_standing={apportionment.final_standing}
                      political_groups={election.political_groups}
                    />
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_largest_surpluses")}</h2>
                    {render_information(apportionment.seats, apportionment.residual_seats)}
                    {highest_surplus_steps.length > 0 && (
                      <LargestSurplusesTable
                        highest_surplus_steps={highest_surplus_steps}
                        final_standing={apportionment.final_standing}
                        political_groups={election.political_groups}
                      />
                    )}
                  </div>
                  {highest_average_steps.length > 0 && (
                    <div>
                      <h2 className={cls.tableTitle}>{t("apportionment.leftover_residual_seats_assignment")}</h2>
                      <span className={cls.tableInformation}>
                        {t(
                          `apportionment.leftover_residual_seats_amount_and_information.${highest_average_steps.length > 1 ? "plural" : "singular"}`,
                          { num_seats: highest_average_steps.length },
                        )}
                      </span>
                      {
                        <LargestAveragesForLessThan19SeatsTable
                          highest_average_steps={highest_average_steps}
                          final_standing={apportionment.final_standing}
                          political_groups={election.political_groups}
                        />
                      }
                    </div>
                  )}
                </>
              )
            ) : (
              <span>{t("apportionment.no_residual_seats_to_assign")}</span>
            )}
          </article>
        </main>
      </>
    );
  }
}
