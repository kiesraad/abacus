import { Link } from "react-router";

import { ResidualSeatsCalculationTable, WholeSeatsTable } from "app/component/apportionment";

import { useApportionmentContext } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { Alert, FormLayout, PageTitle } from "@kiesraad/ui";

import cls from "./Apportionment.module.css";

export function ApportionmentWholeSeatsPage() {
  const { apportionment, error } = useApportionmentContext();

  return (
    <>
      <PageTitle title={`${t("apportionment.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("apportionment.details_whole_seats")}</h1>
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
            apportionment && (
              <>
                <div>
                  <h2 className={cls.table_title}>{t("apportionment.how_often_is_quota_met")}</h2>
                  <span className={cls.table_information}>{t("apportionment.whole_seats_information")}</span>
                  <WholeSeatsTable final_standing={apportionment.final_standing} quota={apportionment.quota} />
                </div>

                <div>
                  <h2 className={cls.table_title}>{t("apportionment.how_many_residual_seats")}</h2>
                  <span className={cls.table_information}>
                    {tx(
                      `apportionment.residual_seats_information_amount_and_link.${apportionment.residual_seats > 1 ? "plural" : "singular"}`,
                      {
                        link: (title) => <Link to="../details-residual-seats">{title}</Link>,
                      },
                      { num_residual_seats: apportionment.residual_seats },
                    )}{" "}
                    {t(
                      `apportionment.residual_seats_information_largest_${apportionment.seats >= 19 ? "averages" : "surpluses"}`,
                    )}
                  </span>
                  <ResidualSeatsCalculationTable
                    seats={apportionment.seats}
                    whole_seats={apportionment.whole_seats}
                    residual_seats={apportionment.residual_seats}
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
