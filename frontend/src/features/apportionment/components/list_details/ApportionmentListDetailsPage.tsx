import { useParams } from "react-router";

import { NotFoundError, useElection } from "@/api";
import { PageTitle } from "@/components/ui";
import { t, tx } from "@/lib/i18n";

import { parseIntStrict } from "@kiesraad/util";

import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import cls from "../Apportionment.module.css";
import { ApportionmentError } from "../ApportionmentError";

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
  const { seatAssignment, candidateNomination, error } = useApportionmentContext();
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
  if (seatAssignment && candidateNomination) {
    const pgTotalSeats = seatAssignment.final_standing[pg.number - 1]?.total_seats || 0;
    return (
      <>
        {render_title_and_header(pgName)}
        <main>
          <article className={cls.article}>
            <>
              <div>
                <h2 className={cls.tableTitle}>{t("apportionment.assigned_number_of_seats")}</h2>
                <span className={cls.tableInformation}>
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
            </>
          </article>
        </main>
      </>
    );
  }
}
