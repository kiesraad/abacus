import { Outlet, useParams } from "react-router-dom";

import { PollingStationProgress } from "app/component/pollingstation/PollingStationProgress";
import { AbortDataEntryControl } from "app/module/input/PollingStation/AbortDataEntryControl.tsx";

import { PollingStationFormController, useElection, usePollingStation } from "@kiesraad/api";
import { Badge, PageTitle, PollingStationNumber, WorkStationNumber } from "@kiesraad/ui";

export function PollingStationLayout() {
  const { election } = useElection();
  const { pollingStationId } = useParams();
  const { pollingStation, loading } = usePollingStation(pollingStationId);

  if (loading) {
    return null;
  }

  if (!pollingStation) {
    throw Error("Polling station not found");
  }

  return (
    <PollingStationFormController
      election={election}
      pollingStationId={pollingStation.id}
      entryNumber={1}
    >
      <PageTitle title={`Invoeren ${pollingStation.number} ${pollingStation.name} - Abacus`} />
      <header>
        <section>
          <PollingStationNumber>{pollingStation.number}</PollingStationNumber>
          <h1>{pollingStation.name}</h1>
          <Badge type="first_entry" />
        </section>
        <section>
          <AbortDataEntryControl />
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>
      <main>
        <nav>
          <PollingStationProgress />
        </nav>
        <article>
          <Outlet />
        </article>
      </main>
    </PollingStationFormController>
  );
}
