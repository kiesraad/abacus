import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { PollingStationForm } from "app/component/form/polling_station/PollingStationForm";
import { PollingStationDeleteModal } from "app/module/polling_stations/page/PollingStationDeleteModal";

import { usePollingStationGet } from "@kiesraad/api";
import { IconTrash } from "@kiesraad/icon";
import { Button, Loader, PageTitle } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

export function PollingStationUpdatePage() {
  const electionId = useNumericParam("electionId");
  const pollingStationId = useNumericParam("pollingStationId");
  const navigate = useNavigate();

  const { requestState } = usePollingStationGet(pollingStationId);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  function toggleShowDeleteModal() {
    setShowDeleteModal(!showDeleteModal);
  }

  const handleSaved = () => {
    navigate(`../?updated=${pollingStationId}`);
  };

  const handleCancel = () => {
    navigate("..");
  };

  function handleDeleted() {
    toggleShowDeleteModal();
    const pollingStation = "data" in requestState ? `${requestState.data.number} (${requestState.data.name})` : "";
    navigate(`../?deleted=${encodeURIComponent(pollingStation)}`);
  }

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
            <>
              <PollingStationForm
                electionId={electionId}
                pollingStation={requestState.data}
                onSaved={handleSaved}
                onCancel={handleCancel}
              />

              <Button
                type="button"
                variant="tertiary-destructive"
                leftIcon={<IconTrash />}
                onClick={toggleShowDeleteModal}
              >
                Stembureau verwijderen
              </Button>
              {showDeleteModal && (
                <PollingStationDeleteModal
                  pollingStationId={pollingStationId}
                  onCancel={toggleShowDeleteModal}
                  onDeleted={handleDeleted}
                />
              )}
            </>
          )}
        </article>
      </main>
    </>
  );
}
