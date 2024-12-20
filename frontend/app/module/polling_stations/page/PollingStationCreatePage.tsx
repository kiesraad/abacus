import { Link, useNavigate } from "react-router-dom";

import { PollingStationForm } from "app/component/form/polling_station/PollingStationForm";
import { NavBar } from "app/component/navbar/NavBar.tsx";

import { PollingStation, useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconChevronRight } from "@kiesraad/icon";
import { PageTitle } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

export function PollingStationCreatePage() {
  const electionId = useNumericParam("electionId");
  const { election } = useElection();
  const navigate = useNavigate();

  const handleSaved = (ps: PollingStation) => {
    navigate(`../?created=${ps.id}`);
  };

  return (
    <>
      <PageTitle title={`${t("polling_stations")} - Abacus`} />
      <NavBar>
        <Link to={`/elections/${election.id}#coordinator`}>
          <span className="bold">{election.location}</span>
          <span>&mdash;</span>
          <span>{election.name}</span>
        </Link>
        <IconChevronRight />
        <Link to={`..`}>
          <span>{t("polling_stations")}</span>
        </Link>
      </NavBar>
      <header>
        <section>
          <h1>{t("polling_station.create")}</h1>
        </section>
      </header>
      <main>
        <article>
          <PollingStationForm electionId={electionId} onSaved={handleSaved} />
        </article>
      </main>
    </>
  );
}
