import { Outlet } from "react-router";

import { PollingStationFormNavigation } from "app/component/pollingstation/PollingStationFormNavigation";
import { PollingStationProgress } from "app/component/pollingstation/PollingStationProgress";
import { AbortDataEntryControl } from "app/module/data_entry";

import { NotFoundError, useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Badge, PageTitle, PollingStationNumber, StickyNav, WorkStationNumber } from "@kiesraad/ui";
import { useNumericParam, usePollingStationStatus } from "@kiesraad/util";

import { PollingStationFormController } from "../../../component/form/data_entry/PollingStationFormController";

export function PollingStationLayout() {
  const pollingStationId = useNumericParam("pollingStationId");
  const entryNumber = useNumericParam("entryNumber");
  const { election, pollingStation } = useElection(pollingStationId);
  const pollingStationStatus = usePollingStationStatus(pollingStation?.id);

  if (!pollingStation) {
    throw new NotFoundError("error.polling_station_not_found");
  }

  if (pollingStationStatus === "definitive") {
    throw new Error("error.polling_station_already_definitive");
  }

  return (
    <PollingStationFormController election={election} pollingStationId={pollingStation.id} entryNumber={entryNumber}>
      <PageTitle title={`${t("data_entry.title")} ${pollingStation.number} ${pollingStation.name} - Abacus`} />
      <header>
        <section className="smaller-gap">
          <PollingStationNumber>{pollingStation.number}</PollingStationNumber>
          <h1>{pollingStation.name}</h1>
          {pollingStationStatus && <Badge type={pollingStationStatus} />}
        </section>
        <section>
          <AbortDataEntryControl />
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>
      <main>
        <StickyNav>
          <PollingStationProgress />
        </StickyNav>
        <article>
          <PollingStationFormNavigation pollingStationId={pollingStation.id} election={election} />
          <Outlet />
        </article>
      </main>
    </PollingStationFormController>
  );
}
