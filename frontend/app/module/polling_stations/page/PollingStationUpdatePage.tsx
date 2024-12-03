import { useNavigate } from "react-router-dom";

import { PollingStationForm } from "app/component/form/polling_station/PollingStationForm";

import { usePollingStationGet } from "@kiesraad/api";
import { Loader, PageTitle } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

export function PollingStationUpdatePage() {
  const electionId = useNumericParam("electionId");
  const pollingStationId = useNumericParam("pollingStationId");
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
