import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { IconTrash } from "@/components/generated/icons";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import type { PollingStation } from "@/types/generated/openapi";

import { usePollingStationGet } from "../hooks/usePollingStationGet";
import { isPollingStationCreateAndUpdateAllowed } from "../utils/checks";
import { PollingStationAlert } from "./PollingStationAlert";
import { PollingStationDeleteModal } from "./PollingStationDeleteModal";
import { PollingStationForm } from "./PollingStationForm";

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function PollingStationUpdatePage() {
  const { isAdministrator, isCoordinator } = useUserRole();
  const pollingStationId = useNumericParam("pollingStationId");
  const { election, currentCommitteeSession, investigation, refetch } = useElection(pollingStationId);
  const navigate = useNavigate();
  const { pushMessage } = useMessages();

  const { requestState } = usePollingStationGet(election.id, pollingStationId);
  const electionStatuses = useElectionStatus();
  const status = electionStatuses.statuses.find((status) => status.polling_station_id === pollingStationId);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  function toggleShowDeleteModal() {
    setShowDeleteModal(!showDeleteModal);
  }

  const [error, setError] = useState<string | undefined>();

  const parentUrl = `/elections/${election.id}/polling-stations`;

  function closeError() {
    setError(undefined);
  }

  function handleSaved(pollingStation: PollingStation) {
    if (currentCommitteeSession.status === "data_entry_finished") {
      pushMessage({
        type: "warning",
        title: t("generate_new_results"),
        text: `${t("polling_station.message.polling_station_updated", {
          number: pollingStation.number,
          name: pollingStation.name,
        })}. ${t("documents_are_invalidated")}`,
      });
    } else {
      pushMessage({
        title: t("polling_station.message.polling_station_updated", {
          number: pollingStation.number,
          name: pollingStation.name,
        }),
      });
    }
    void refetch();
    void navigate(parentUrl);
  }

  function handleCancel() {
    void navigate(parentUrl);
  }

  function handleDeleted(pollingStation: PollingStation) {
    toggleShowDeleteModal();
    if (currentCommitteeSession.status === "data_entry_finished") {
      pushMessage({
        type: "warning",
        title: t("generate_new_results"),
        text: `${t("polling_station.message.polling_station_deleted", {
          number: pollingStation.number,
          name: pollingStation.name,
        })}. ${t("documents_are_invalidated")}`,
      });
    } else {
      pushMessage({
        title: t("polling_station.message.polling_station_deleted", {
          number: pollingStation.number,
          name: pollingStation.name,
        }),
      });
    }
    void refetch();
    void navigate(parentUrl, { replace: true });
  }

  function handleDeleteError() {
    setShowDeleteModal(false);
    setError(t("polling_station.message.delete_error_title"));
  }

  useEffect(() => {
    if (error) {
      window.scrollTo(0, 0);
    }
  }, [error]);

  if (!isPollingStationCreateAndUpdateAllowed(isCoordinator, isAdministrator, currentCommitteeSession.status)) {
    return <Navigate to={parentUrl} replace />;
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
                  {requestState.data.id_prev_session !== undefined ? (
                    <section className="sm">
                      <strong>{t("polling_station.delete_not_possible.title")}</strong>
                      <p>{t("polling_station.delete_not_possible.pre_existing_polling_station")}</p>
                    </section>
                  ) : (
                    <>
                      <Button variant="tertiary-destructive" leftIcon={<IconTrash />} onClick={toggleShowDeleteModal}>
                        {t("polling_station.delete")}
                      </Button>
                      {showDeleteModal && (
                        <PollingStationDeleteModal
                          electionId={election.id}
                          pollingStation={requestState.data}
                          existingInvestigation={!!investigation}
                          existingDataEntry={status !== undefined && status.status !== "empty"}
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
