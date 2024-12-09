import { Link, useNavigate } from "react-router-dom";

import { PollingStationForm } from "app/component/form/polling_station/PollingStationForm";
import { NavBar } from "app/component/navbar/NavBar.tsx";

import { useElection, usePollingStationGet } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconChevronRight } from "@kiesraad/icon";
import { Loader, PageTitle } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

export function PollingStationUpdatePage() {
  const electionId = useNumericParam("electionId");
  const pollingStationId = useNumericParam("pollingStationId");
  const { election } = useElection();
  const navigate = useNavigate();

  const { requestState } = usePollingStationGet(pollingStationId);

  const handleSaved = () => {
    navigate(`../?updated=${pollingStationId}`);
  };

  const handleCancel = () => {
    navigate("..");
  };

  return (
    <>
      <PageTitle title="Stembureaus - Abacus" />
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
          <h1>Stembureau wijzigen</h1>
        </section>
      </header>
      <main>
        <article>
          {requestState.status === "loading" && <Loader />}

          {requestState.status === "success" && (
            <PollingStationForm
              electionId={electionId}
              pollingStation={requestState.data}
              onSaved={handleSaved}
              onCancel={handleCancel}
            />
          )}
        </article>
      </main>
    </>
  );
}
