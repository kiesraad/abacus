import { Link, Outlet } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";
import { PollingStationFormNavigation } from "app/component/pollingstation/PollingStationFormNavigation";
import { PollingStationProgress } from "app/component/pollingstation/PollingStationProgress";
import { AbortDataEntryControl } from "app/module/data_entry";

import { NotFoundError, PollingStationFormController, useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconChevronRight } from "@kiesraad/icon";
import { Badge, PageTitle, PollingStationNumber, StickyNav, WorkStationNumber } from "@kiesraad/ui";
import { useNumericParam, usePollingStationStatus } from "@kiesraad/util";

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
      <NavBar>
        <Link to={"/elections"}>{t("overview")}</Link>
        <IconChevronRight />
        <Link to={`/elections/${election.id}/data-entry`}>
          <span className="bold">{election.location}</span>
          <span>&mdash;</span>
          <span>{election.name}</span>
        </Link>
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
