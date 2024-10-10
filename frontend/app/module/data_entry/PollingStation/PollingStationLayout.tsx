import { Link, Outlet, useParams } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";
import { PollingStationFormNavigation } from "app/component/pollingstation/PollingStationFormNavigation";
import { PollingStationProgress } from "app/component/pollingstation/PollingStationProgress";
import { AbortDataEntryControl } from "app/module/data_entry/PollingStation/AbortDataEntryControl";

import { PollingStationFormController, useElection } from "@kiesraad/api";
import { IconChevronRight } from "@kiesraad/icon";
import { Badge, PageTitle, PollingStationNumber, WorkStationNumber } from "@kiesraad/ui";
import { usePollingStationStatus } from "@kiesraad/util";

export function PollingStationLayout() {
  const { pollingStationId } = useParams();
  const { election, pollingStation } = useElection(pollingStationId);
  const pollingStationStatus = usePollingStationStatus(pollingStation?.id);

  if (!pollingStation) {
    throw Error("Polling station not found");
  }

  if (pollingStationStatus === "definitive") {
    throw Error("Polling station already finalised");
  }

  return (
    <PollingStationFormController election={election} pollingStationId={pollingStation.id} entryNumber={1}>
      <PageTitle title={`Invoeren ${pollingStation.number} ${pollingStation.name} - Abacus`} />
      <NavBar>
        <Link to={"/elections"}>Overzicht</Link>
        <IconChevronRight />
        <Link to={`/elections/${election.id}/data-entry`}>{election.name}</Link>
      </NavBar>
      <header>
        <section>
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
        <nav>
          <PollingStationProgress />
        </nav>
        <article>
          <PollingStationFormNavigation pollingStationId={pollingStation.id} election={election} />
          <Outlet />
        </article>
      </main>
    </PollingStationFormController>
  );
}
