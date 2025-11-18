import * as React from "react";
import { Navigate, useNavigate } from "react-router";

import { IconTrash } from "@/components/generated/icons";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import { PollingStation } from "@/types/generated/openapi";

import { usePollingStationGet } from "../hooks/usePollingStationGet";
import { PollingStationAlert } from "./PollingStationAlert";
import { PollingStationDeleteModal } from "./PollingStationDeleteModal";
import { PollingStationForm } from "./PollingStationForm";

export function PollingStationUpdatePage() {
  const { isAdministrator } = useUserRole();
  const pollingStationId = useNumericParam("pollingStationId");
  const { election, currentCommitteeSession } = useElection();
  const navigate = useNavigate();
  const { pushMessage } = useMessages();

  const { requestState } = usePollingStationGet(election.id, pollingStationId);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  function toggleShowDeleteModal() {
    setShowDeleteModal(!showDeleteModal);
  }

  const [error, setError] = React.useState<[string, string] | undefined>(undefined);

  const parentUrl = `/elections/${election.id}/polling-stations`;
  const isPreExistingPollingStation =
    requestState.status === "success" && requestState.data.id_prev_session !== undefined;

  function closeError() {
    setError(undefined);
  }

  function handleSaved(pollingStation: PollingStation) {
    pushMessage({
      title: t("polling_station.message.polling_station_updated", {
        number: pollingStation.number,
        name: pollingStation.name,
      }),
    });

    void navigate(parentUrl);
  }

  function handleCancel() {
    void navigate(parentUrl);
  }

  function handleDeleted(pollingStation: PollingStation) {
    toggleShowDeleteModal();
    pushMessage({
      title: t("polling_station.message.polling_station_deleted", {
        number: pollingStation.number,
        name: pollingStation.name,
      }),
    });

    void navigate(parentUrl);
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

  if (
    isAdministrator &&
    currentCommitteeSession.status !== "created" &&
    currentCommitteeSession.status !== "data_entry_not_started"
  ) {
    return <Navigate to={".."} replace />;
  } else {
    return (
      <>
        <PageTitle title={`${t("polling_station.title.plural")} - Abacus`} />
        <header>
          <section>
            <h1>{t("polling_station.update")}</h1>
          </section>
        </header>

        <PollingStationAlert />

        {error && (
          <Alert type="error" onClose={closeError}>
            <strong className="heading-md">{error[0]}</strong>
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

                <div className="mt-md-lg">
                  {isPreExistingPollingStation ? (
                    <>
                      <strong>{t("polling_station.delete_not_possible.title")}</strong>
                      <p>{t("polling_station.delete_not_possible.message")}</p>
                    </>
                  ) : (
                    <>
                      <Button variant="tertiary-destructive" leftIcon={<IconTrash />} onClick={toggleShowDeleteModal}>
                        {t("polling_station.delete")}
                      </Button>
                      {showDeleteModal && (
                        <PollingStationDeleteModal
                          electionId={election.id}
                          pollingStation={requestState.data}
                          onCancel={toggleShowDeleteModal}
                          onError={handleDeleteError}
                          onDeleted={handleDeleted}
                        />
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </article>
        </main>
      </>
    );
  }
}
