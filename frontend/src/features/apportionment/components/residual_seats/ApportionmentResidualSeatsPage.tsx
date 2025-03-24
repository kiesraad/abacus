import { Link } from "react-router";

import { AbsoluteMajorityChange, useElection } from "@/api";
import { Alert, FormLayout, PageTitle } from "@/components/ui";
import { t, tx } from "@/lib/i18n";

import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import cls from "../Apportionment.module.css";
import { LargestAveragesFor19OrMoreSeatsTable } from "./LargestAveragesFor19OrMoreSeatsTable";
import { LargestAveragesForLessThan19SeatsTable } from "./LargestAveragesForLessThan19SeatsTable";
import { LargestRemaindersTable } from "./LargestRemaindersTable";

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
        `apportionment.full_seats_information_link.${residualSeats > 1 ? "plural" : "singular"}`,
        {
          link: (title) => <Link to="../details-full-seats">{title}</Link>,
        },
        { num_residual_seats: residualSeats },
      )}
      <br />
      <br />
      {tx(`apportionment.information_largest_${seats >= 19 ? "averages" : "remainders"}`)}
    </span>
  );
}

export function ApportionmentResidualSeatsPage() {
  const { election } = useElection();
  const { seatAssignment, error } = useApportionmentContext();

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
  if (seatAssignment) {
    const largestRemainderSteps = seatAssignment.steps.filter((step) => step.change.assigned_by === "LargestRemainder");
    const largestAverageSteps = seatAssignment.steps.filter((step) => step.change.assigned_by === "LargestAverage");
    const absoluteMajorityChange = seatAssignment.steps
      .map((step) => step.change)
      .find((change) => change.assigned_by === "AbsoluteMajorityChange") as AbsoluteMajorityChange | undefined;
    return (
      <>
        {render_title_and_header()}
        <main>
          <article className={cls.article}>
            {seatAssignment.residual_seats > 0 ? (
              <>
                {seatAssignment.seats >= 19 ? (
                  <div>
                    <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_largest_averages")}</h2>
                    {render_information(seatAssignment.seats, seatAssignment.residual_seats)}
                    {largestAverageSteps.length > 0 && (
                      <LargestAveragesFor19OrMoreSeatsTable
                        largestAverageSteps={largestAverageSteps}
                        finalStanding={seatAssignment.final_standing}
                        politicalGroups={election.political_groups}
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className={cls.tableTitle}>{t("apportionment.residual_seats_largest_remainders")}</h2>
                      {render_information(seatAssignment.seats, seatAssignment.residual_seats)}
                      {largestRemainderSteps.length > 0 && (
                        <LargestRemaindersTable
                          largestRemainderSteps={largestRemainderSteps}
                          finalStanding={seatAssignment.final_standing}
                          politicalGroups={election.political_groups}
                        />
                      )}
                    </div>
                    {largestAverageSteps.length > 0 && (
                      <div>
                        <h2 className={cls.tableTitle}>{t("apportionment.remaining_residual_seats_assignment")}</h2>
                        <span className={cls.tableInformation}>
                          {t(
                            `apportionment.remaining_residual_seats_amount_and_information.${largestAverageSteps.length > 1 ? "plural" : "singular"}`,
                            { num_seats: largestAverageSteps.length },
                          )}
                        </span>
                        {
                          <LargestAveragesForLessThan19SeatsTable
                            largestAverageSteps={largestAverageSteps}
                            finalStanding={seatAssignment.final_standing}
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
