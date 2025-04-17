import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { useElection } from "@/api/election/useElection";
import { useElectionStatus } from "@/api/election/useElectionStatus";
import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { t } from "@/lib/i18n";

import { DataEntryChoiceForm } from "./DataEntryChoiceForm";
import { ElectionProgress } from "./ElectionProgress";

export function DataEntryChoicePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { election, pollingStations } = useElection();
  const { statuses, refetch } = useElectionStatus();

  // re-fetch statuses when component mounts
  useEffect(() => {
    const abortController = new AbortController();

    void refetch(abortController);

    return () => {
      abortController.abort(DEFAULT_CANCEL_REASON);
    };
  }, [refetch]);

  const showFirstDataEntrySavedAlert = location.hash === "#data-entry-saved-1";
  const showSecondDataEntrySavedAlert = location.hash === "#data-entry-saved-2";
  const dataEntryDone = showFirstDataEntrySavedAlert || showSecondDataEntrySavedAlert;

  const showDataEntryClaimedAlert = location.hash.startsWith("#data-entry-claimed-") ? location.hash : null;
  const showDataEntryFinalisedAlert = location.hash.startsWith("#data-entry-finalised-") ? location.hash : null;
  let claimedPollingStationNumber = 0;
  if (showDataEntryClaimedAlert) {
    const id = parseInt(showDataEntryClaimedAlert.substring(showDataEntryClaimedAlert.lastIndexOf("-") + 1));
    claimedPollingStationNumber = pollingStations.find((ps) => ps.id === id)?.number ?? 0;
  }
  if (showDataEntryFinalisedAlert) {
    const id = parseInt(showDataEntryFinalisedAlert.substring(showDataEntryFinalisedAlert.lastIndexOf("-") + 1));
    claimedPollingStationNumber = pollingStations.find((ps) => ps.id === id)?.number ?? 0;
  }

  function closeDataEntrySavedAlert() {
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
      {dataEntryDone && (
        <Alert type="success" onClose={closeDataEntrySavedAlert}>
          <h2>{t("data_entry.entry_saved")}</h2>
          <p>
            {t("data_entry.success.return_paper")}
            {showFirstDataEntrySavedAlert && (
              <>
                <br />
                {t("data_entry.success.second_entry_info")}
              </>
            )}
          </p>
        </Alert>
      )}

      {claimedPollingStationNumber !== 0 && (
        <Alert type="warning" onClose={closeDataEntryWarningAlert}>
          <h2 id="dataEntryWarningAlertTitle">
            {t("data_entry.warning.data_entry_not_possible", {
              nr: claimedPollingStationNumber,
            })}
          </h2>
          {showDataEntryClaimedAlert && (
            <p id="dataEntryWarningAlertDescription">{t("data_entry.warning.data_entry_already_claimed")}</p>
          )}
          {showDataEntryFinalisedAlert && (
            <p id="dataEntryWarningAlertDescription">{t("data_entry.warning.data_entry_already_finalised")}</p>
          )}
        </Alert>
      )}

      {statuses.length > 0 && statuses.every((s) => s.status === "definitive") && (
        <Alert type="success">
          <h2>{t("data_entry.completed.all_entries_completed")}</h2>
          <p>{t("data_entry.completed.thank_you")}</p>
          <p>{t("data_entry.completed.info", { electionName: election.name })}</p>
          <p>{t("data_entry.completed.wait_for_instructions")}</p>
        </Alert>
      )}
      <main>
        <article id="polling-station-choice-form">
          <DataEntryChoiceForm anotherEntry={dataEntryDone} />
        </article>
        <ElectionProgress />
      </main>
      <Footer />
    </>
  );
}
