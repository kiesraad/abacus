import { Link, Outlet, useParams } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";
import { PollingStationFormNavigation } from "app/component/pollingstation/PollingStationFormNavigation";
import { PollingStationProgress } from "app/component/pollingstation/PollingStationProgress";
import { AbortDataEntryControl } from "app/module/data_entry/PollingStation/AbortDataEntryControl";

import { PollingStationFormController, useElection, usePollingStation } from "@kiesraad/api";
import { IconChevronRight } from "@kiesraad/icon";
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
    <PollingStationFormController election={election} pollingStationId={pollingStation.id} entryNumber={1}>
      <PageTitle title={`Invoeren ${pollingStation.number} ${pollingStation.name} - Abacus`} />
      <NavBar>
        <Link to={"/overview"}>Overzicht</Link>
        <IconChevronRight />
        <Link to={`/elections/${election.id}/data-entry`}>{election.name}</Link>
      </NavBar>
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
          <PollingStationFormNavigation pollingStationId={pollingStation.id} election={election} />
          <Outlet />
        </article>
      </main>
    </PollingStationFormController>
  );
}
