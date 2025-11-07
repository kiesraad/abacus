import { Outlet } from "react-router";

import { NotFoundError } from "@/api/ApiResult";
import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { Badge } from "@/components/ui/Badge/Badge";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { usePollingStationDataEntryErrors } from "../hooks/usePollingStationDataEntryErrors";
import { DetailNavigation } from "./DetailNavigation";

export function DetailLayout() {
  const pollingStationId = useNumericParam("pollingStationId");
  const { election, pollingStation } = useElection(pollingStationId);
  const { loading, dataEntry } = usePollingStationDataEntryErrors(pollingStationId);

  if (!pollingStation) {
    throw new NotFoundError("error.polling_station_not_found");
  }

  if (loading || !dataEntry) {
    return null;
  }

  const structure = getDataEntryStructure(dataEntry.data.model, election);

  return (
    <>
      <PageTitle
        title={`${t(`data_entry_detail.${dataEntry.status === "first_entry_has_errors" ? "resolve_errors.page_title" : "read_only.page_title"}`)} - Abacus`}
      />

      <header>
        <section className="smaller-gap">
          <PollingStationNumber>{pollingStation.number}</PollingStationNumber>
          <h1>{pollingStation.name}</h1>
          <Badge type={dataEntry.status} readOnlyStatus={dataEntry.status !== "first_entry_has_errors"} />
        </section>
      </header>
      <Messages />
      <main>
        <StickyNav>
          <DetailNavigation
            structure={structure}
            status={dataEntry.status}
            validationResults={dataEntry.validation_results}
          />
        </StickyNav>
        <article>
          <Outlet />
        </article>
      </main>
    </>
  );
}
