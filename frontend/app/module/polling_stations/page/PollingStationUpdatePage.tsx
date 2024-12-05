import * as React from "react";
import { useNavigate } from "react-router-dom";

import { PollingStationForm } from "app/component/form/polling_station/PollingStationForm";
import { PollingStationDeleteModal } from "app/module/polling_stations/page/PollingStationDeleteModal";

import { usePollingStationGet } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconTrash } from "@kiesraad/icon";
import { Alert, Button, Loader, PageTitle } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

export function PollingStationUpdatePage() {
  const electionId = useNumericParam("electionId");
  const pollingStationId = useNumericParam("pollingStationId");
  const navigate = useNavigate();

  const { requestState } = usePollingStationGet(pollingStationId);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  function toggleShowDeleteModal() {
    setShowDeleteModal(!showDeleteModal);
  }

  const [error, setError] = React.useState<[string, string] | undefined>(undefined);

  function closeError() {
    setError(undefined);
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
                {t("polling_station.delete")}
              </Button>
              {showDeleteModal && (
                <PollingStationDeleteModal
                  pollingStationId={pollingStationId}
                  onCancel={toggleShowDeleteModal}
                  onError={handleDeleteError}
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
