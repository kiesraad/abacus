import { Link } from "react-router";

import { RestSeatsCalculationTable, WholeSeatsTable } from "app/component/apportionment";

import { useApportionmentContext } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { Alert, FormLayout, PageTitle } from "@kiesraad/ui";

import cls from "./ApportionmentPage.module.css";

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
                  <h2 className={cls.table_title}>{t("apportionment.how_many_rest_seats")}</h2>
                  <span className={cls.table_information}>
                    {tx(
                      `apportionment.rest_seats_information_amount_and_link.${apportionment.rest_seats > 1 ? "plural" : "singular"}`,
                      {
                        link: (title) => <Link to="../details-rest-seats">{title}</Link>,
                      },
                      { num_rest_seats: apportionment.rest_seats },
                    )}{" "}
                    {t(
                      `apportionment.rest_seats_information_largest_${apportionment.seats >= 19 ? "averages" : "surpluses"}`,
                    )}
                  </span>
                  <RestSeatsCalculationTable
                    seats={apportionment.seats}
                    whole_seats={apportionment.whole_seats}
                    rest_seats={apportionment.rest_seats}
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
