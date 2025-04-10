import * as React from "react";
import { useNavigate } from "react-router";

import { useElection } from "@/api/election/useElection";
import { PageTitle } from "@/components/page-title/page-title";
import { Alert, Button, Loader } from "@/components/ui";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/lib/i18n";
import { IconTrash } from "@/lib/icon";

import { usePollingStationGet } from "../hooks/usePollingStationGet";
import { PollingStationDeleteModal } from "./PollingStationDeleteModal";
import { PollingStationForm } from "./PollingStationForm";

export function PollingStationUpdatePage() {
  const pollingStationId = useNumericParam("pollingStationId");
  const { election } = useElection();
  const navigate = useNavigate();

  const { requestState } = usePollingStationGet(election.id, pollingStationId);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  function toggleShowDeleteModal() {
    setShowDeleteModal(!showDeleteModal);
  }

  const [error, setError] = React.useState<[string, string] | undefined>(undefined);

  const parentUrl = `/elections/${election.id}/polling-stations`;

  function closeError() {
    setError(undefined);
  }

  function handleSaved() {
    void navigate(`${parentUrl}?updated=${pollingStationId}`);
  }

  function handleCancel() {
    void navigate(parentUrl);
  }

  function handleDeleted() {
    toggleShowDeleteModal();
    const pollingStation = "data" in requestState ? `${requestState.data.number} (${requestState.data.name})` : "";
    void navigate(`${parentUrl}?deleted=${encodeURIComponent(pollingStation)}`);
  }

  function handleDeleteError() {
    setShowDeleteModal(false);
    setError([t("polling_station.message.delete_error_title"), t("polling_station.message.delete_error")]);
  }

  React.useEffect(() => {
    if (error) {
      window.scrollTo(0, 0);
    }
  }, [error]);

  return (
    <>
      <PageTitle title={`${t("polling_stations")} - Abacus`} />
      <header>
        <section>
          <h1>{t("polling_station.update")}</h1>
        </section>
      </header>

      {error && (
        <Alert type="error" onClose={closeError}>
          <h2>{error[0]}</h2>
          <p>{error[1]}</p>
        </Alert>
      )}

      <main>
        <article>
          {requestState.status === "loading" && <Loader />}

          {requestState.status === "success" && (
            <>
              <PollingStationForm
                electionId={election.id}
                pollingStation={requestState.data}
                onSaved={handleSaved}
                onCancel={handleCancel}
              />

              <div className="mt-lg">
                <Button
                  type="button"
                  variant="tertiary-destructive"
                  leftIcon={<IconTrash />}
                  onClick={toggleShowDeleteModal}
                >
                  {t("polling_station.delete")}
                </Button>
                {showDeleteModal && (
                  <PollingStationDeleteModal
                    electionId={election.id}
                    pollingStationId={pollingStationId}
                    onCancel={toggleShowDeleteModal}
                    onError={handleDeleteError}
                    onDeleted={handleDeleted}
                  />
                )}
              </div>
            </>
          )}
        </article>
      </main>
    </>
  );
}
