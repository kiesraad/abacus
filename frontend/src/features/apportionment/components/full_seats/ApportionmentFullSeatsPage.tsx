import { Link } from "react-router";

import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";
import { cn } from "@/utils/classnames";

import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import type { ResultChange } from "../../utils/seat-change";
import { getRemovalSteps } from "../../utils/steps";
import { renderTitleAndHeader } from "../../utils/utils";
import cls from "../Apportionment.module.css";
import { ApportionmentErrorPage } from "../ApportionmentError";
import { Footnotes } from "./Footnotes";
import { FullSeatsTable } from "./FullSeatsTable";
import { ResidualSeatsCalculationTable } from "./ResidualSeatsCalculationTable";

export function ApportionmentFullSeatsPage() {
  const { election } = useElection();
  const { seatAssignment, error } = useApportionmentContext();

  if (error) {
    return <ApportionmentErrorPage sectionTitle={t("apportionment.details_full_seats")} error={error} />;
  }
  if (seatAssignment) {
    const [fullSeatRemovalSteps, ,] = getRemovalSteps(seatAssignment);
    const resultChanges: ResultChange[] = [];
    fullSeatRemovalSteps.forEach((step, index) => {
      const footnoteNumber = index + 1;
      resultChanges.push({
        listNumber: step.change.list_retracted_seat,
        footnoteNumber: footnoteNumber,
        increase: 0,
        decrease: 1,
        type: "full_seat",
      });
    });
    return (
      <>
        {renderTitleAndHeader(t("apportionment.details_full_seats"))}
        <main>
          <article className={cls.article}>
            <div className={cn(cls.tableDiv, "mb-lg")}>
              <div>
                <h2 className={cls.tableTitle}>{t("apportionment.how_often_is_quota_met")}</h2>
                <span className={cls.tableInformation}>{t("apportionment.full_seats_information")}</span>
                <FullSeatsTable
                  finalStanding={seatAssignment.final_standing}
                  politicalGroups={election.political_groups}
                  quota={seatAssignment.quota}
                  resultChanges={resultChanges}
                />
              </div>
              {fullSeatRemovalSteps.length > 0 && <Footnotes fullSeatRemovalSteps={fullSeatRemovalSteps} />}
            </div>
            <div className={cn(cls.tableDiv, "mb-lg")}>
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
            </div>
          </article>
        </main>
      </>
    );
  }
}
