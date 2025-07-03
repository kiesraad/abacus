import { Outlet } from "react-router";

import { NotFoundError } from "@/api/ApiResult";
import { PageTitle } from "@/components/page_title/PageTitle";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { Badge } from "@/components/ui/Badge/Badge";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { usePollingStationDataEntryErrors } from "../hooks/usePollingStationDataEntryErrors";
import cls from "./ResolveErrors.module.css";
import { ResolveErrorsNavigation } from "./ResolveErrorsNavigation";

export function ResolveErrorsLayout() {
  const pollingStationId = useNumericParam("pollingStationId");
  const { election, pollingStation } = useElection(pollingStationId);
  const { loading, dataEntry } = usePollingStationDataEntryErrors(pollingStationId);

  if (!pollingStation) {
    throw new NotFoundError("error.polling_station_not_found");
  }

  if (loading || !dataEntry) {
    return null;
  }

  const structure = getDataEntryStructure(election, dataEntry.finalised_first_entry);

  return (
    <>
      <PageTitle title={`${t("resolve_errors.page_title")} - Abacus`} />
      <header>
        <section className="smaller-gap">
          <PollingStationNumber>{pollingStation.number}</PollingStationNumber>
          <h1>{pollingStation.name}</h1>
          <Badge type="first_entry_has_errors" />
        </section>
      </header>
      <main className={cls.resolveErrors}>
        <StickyNav>
          <ResolveErrorsNavigation structure={structure} validationResults={dataEntry.validation_results} />
        </StickyNav>
        <article>
          <Outlet />
        </article>
      </main>
    </>
  );
}
