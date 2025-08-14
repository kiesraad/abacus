import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { CommitteeSessionPausedModal } from "@/components/data_entry/CommitteeSessionPausedModal";
import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { t } from "@/i18n/translate";

import { ElectionProgress } from "./ElectionProgress";
import { PollingStationChoiceForm } from "./PollingStationChoiceForm";

export function DataEntryHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { committeeSession, election, pollingStations, refetch: refetchElection } = useElection();
  const { statuses, refetch: refetchStatuses } = useElectionStatus();

  // re-fetch statuses when component mounts
  useEffect(() => {
    const abortController = new AbortController();

    void refetchElection(abortController);
    void refetchStatuses(abortController);

    return () => {
      abortController.abort(DEFAULT_CANCEL_REASON);
    };
  }, [refetchElection, refetchStatuses]);

  const showFirstDataEntrySavedAlert = location.hash.startsWith("#data-entry-1-saved") ? location.hash : null;
  const showSecondDataEntrySavedAlert = location.hash.startsWith("#data-entry-2-saved") ? location.hash : null;
  const dataEntryDone = showFirstDataEntrySavedAlert || showSecondDataEntrySavedAlert || undefined;

  const showDifferenceWithFirstEntryAlert = location.hash.startsWith("#data-entry-different") ? location.hash : null;
  const showFirstEntryHasErrorsAlert = location.hash.startsWith("#data-entry-errors") ? location.hash : null;
  const dataEntryNotification = showDifferenceWithFirstEntryAlert || showFirstEntryHasErrorsAlert || undefined;

  const showDataEntryClaimedAlert = location.hash.startsWith("#data-entry-claimed-") ? location.hash : null;
  const showDataEntryFinalisedAlert = location.hash.startsWith("#data-entry-finalised-") ? location.hash : null;
  const showInvalidActionAlert = location.hash.startsWith("#invalid-action-") ? location.hash : null;
  const dataEntryWarning =
    showDataEntryClaimedAlert || showDataEntryFinalisedAlert || showInvalidActionAlert || undefined;

  let claimedPollingStationNumber = 0;
  if (dataEntryWarning) {
    const id = parseInt(dataEntryWarning.substring(dataEntryWarning.lastIndexOf("-") + 1));
    claimedPollingStationNumber = pollingStations.find((ps) => ps.id === id)?.number ?? 0;
  }

  function closeDataEntrySavedAlert() {
    void navigate(location.pathname);
  }

  function closeDataEntryNotifyAlert() {
    void navigate(location.pathname);
  }

  function closeDataEntryWarningAlert() {
    void navigate(location.pathname);
  }

  return (
    <>
      <PageTitle title={`${t("data_entry.pick_polling_station")} - Abacus`} />
      <header>
        <section>
          <h1>{election.name}</h1>
        </section>
      </header>
      {committeeSession.status === "data_entry_paused" && <CommitteeSessionPausedModal />}
      {dataEntryDone && (
        <Alert type="success" onClose={closeDataEntrySavedAlert}>
          <strong className="heading-md">{t("data_entry.entry_saved")}</strong>
          <p>
            {t("data_entry.success.return_paper")}.
            {showFirstDataEntrySavedAlert && (
              <>
                <br />
                {t("data_entry.success.second_entry_info")}
              </>
            )}
          </p>
        </Alert>
      )}

      {dataEntryNotification && (
        <Alert type="notify" onClose={closeDataEntryNotifyAlert}>
          <strong className="heading-md">
            {showDifferenceWithFirstEntryAlert ? t("data_entry.entry_different") : t("data_entry.entry_errors")}
          </strong>
          <p>
            {t("data_entry.entry_saved")}. {t("data_entry.success.return_paper")},<br />
            {showDifferenceWithFirstEntryAlert
              ? t("data_entry.success.different_entry_info")
              : t("data_entry.success.errors_entry_info")}
          </p>
        </Alert>
      )}

      {dataEntryWarning && claimedPollingStationNumber !== 0 && (
        <Alert type="warning" onClose={closeDataEntryWarningAlert}>
          <strong className="heading-md" id="dataEntryWarningAlertTitle">
            {t("data_entry.data_entry_not_possible", {
              nr: claimedPollingStationNumber,
            })}
          </strong>
          <p id="dataEntryWarningAlertDescription">
            {t(
              `error.api_error.${
                showDataEntryClaimedAlert
                  ? "DataEntryAlreadyClaimed"
                  : showDataEntryFinalisedAlert
                    ? "DataEntryAlreadyFinalised"
                    : "InvalidStateTransition"
              }`,
            )}
          </p>
        </Alert>
      )}

      {statuses.length > 0 && statuses.every((s) => s.status === "definitive") && (
        <Alert type="success">
          <strong className="heading-md">{t("data_entry.completed.all_entries_completed")}</strong>
          <p>{t("data_entry.completed.thank_you")}</p>
          <p>{t("data_entry.completed.info", { electionName: election.name })}</p>
          <p>{t("data_entry.completed.wait_for_instructions")}</p>
        </Alert>
      )}
      <main>
        <article id="polling-station-choice-form">
          <PollingStationChoiceForm anotherEntry={!!dataEntryDone || !!dataEntryNotification} />
        </article>
        <ElectionProgress />
      </main>
      <Footer />
    </>
  );
}
