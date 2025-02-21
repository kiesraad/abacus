import { Link } from "react-router";

import {
  LargestAveragesFor19OrMoreSeatsTable,
  LargestAveragesForLessThan19SeatsTable,
  LargestSurplusesTable,
} from "app/component/apportionment";

import { AbsoluteMajorityChange, useApportionmentContext, useElection } from "@kiesraad/api";
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

function render_information(seats: number, residualSeats: number) {
  return (
    <span className={cls.tableInformation}>
      {tx(
        `apportionment.whole_seats_information_link.${residualSeats > 1 ? "plural" : "singular"}`,
        {
          link: (title) => <Link to="../details-whole-seats">{title}</Link>,
        },
        { num_residual_seats: residualSeats },
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
    const highestSurplusSteps = apportionment.steps.filter((step) => step.change.assigned_by === "HighestSurplus");
    const highestAverageSteps = apportionment.steps.filter((step) => step.change.assigned_by === "HighestAverage");
    const absoluteMajorityChangeSteps = apportionment.steps.filter(
      (step) => step.change.assigned_by === "AbsoluteMajorityChange",
    );
    const absoluteMajorityChange =
      absoluteMajorityChangeSteps.length > 0
        ? (absoluteMajorityChangeSteps[0]?.change as AbsoluteMajorityChange)
        : undefined;
    return (
      <>
        {render_title_and_header()}
        <main>
          <article className={cls.article}>
            {apportionment.residual_seats > 0 ? (
              <>
                {apportionment.seats >= 19 ? (
                  <div>
                    <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_largest_averages")}</h2>
                    {render_information(apportionment.seats, apportionment.residual_seats)}
                    {highestAverageSteps.length > 0 && (
                      <LargestAveragesFor19OrMoreSeatsTable
                        highestAverageSteps={highestAverageSteps}
                        finalStanding={apportionment.final_standing}
                        politicalGroups={election.political_groups}
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_largest_surpluses")}</h2>
                      {render_information(apportionment.seats, apportionment.residual_seats)}
                      {highestSurplusSteps.length > 0 && (
                        <LargestSurplusesTable
                          highestSurplusSteps={highestSurplusSteps}
                          finalStanding={apportionment.final_standing}
                          politicalGroups={election.political_groups}
                        />
                      )}
                    </div>
                    {highestAverageSteps.length > 0 && (
                      <div>
                        <h2 className={cls.tableTitle}>{t("apportionment.leftover_residual_seats_assignment")}</h2>
                        <span className={cls.tableInformation}>
                          {t(
                            `apportionment.leftover_residual_seats_amount_and_information.${highestAverageSteps.length > 1 ? "plural" : "singular"}`,
                            { num_seats: highestAverageSteps.length },
                          )}
                        </span>
                        {
                          <LargestAveragesForLessThan19SeatsTable
                            highestAverageSteps={highestAverageSteps}
                            finalStanding={apportionment.final_standing}
                            politicalGroups={election.political_groups}
                          />
                        }
                      </div>
                    )}
                  </>
                )}
                {absoluteMajorityChange && (
                  <span id="absolute_majority_change_information" className={cls.absoluteMajorityChangeInformation}>
                    {t("apportionment.absolute_majority_change", {
                      pg_assigned_seat: absoluteMajorityChange.pg_assigned_seat,
                      pg_retracted_seat: absoluteMajorityChange.pg_retracted_seat,
                    })}
                  </span>
                )}
              </>
            ) : (
              <span>{t("apportionment.no_residual_seats_to_assign")}</span>
            )}
          </article>
        </main>
      </>
    );
  }
}
