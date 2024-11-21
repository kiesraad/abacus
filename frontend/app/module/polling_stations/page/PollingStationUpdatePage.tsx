import { useNavigate } from "react-router-dom";

import { PollingStationForm } from "app/component/form/polling_station/PollingStationForm";

import { PollingStation, usePollingStationGet } from "@kiesraad/api";
import { Loader, PageTitle } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

export function PollingStationUpdatePage() {
  const pollingStationId = useNumericParam("pollingStationId");
  const navigate = useNavigate();

  const { requestState } = usePollingStationGet(pollingStationId);

  const onSave = (ps: PollingStation) => {
    navigate(`../?updated=${ps.id}`);
  };

  return (
    <>
      <PageTitle title="Stembureaus - Abacus" />
      <header>
        <section>
          <h1>Stembureau wijzigen</h1>
        </section>
      </header>
      <main>
        <article>
          {requestState.status === "loading" && <Loader />}

          {requestState.status === "success" && (
            <PollingStationForm electionId={1} pollingStation={requestState.data} onSaved={onSave} />
          )}
        </article>
      </main>
    </>
  );
}
