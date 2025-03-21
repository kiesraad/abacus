import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

import { ElectionProgress } from "@/components/election/ElectionProgress";
import { Footer } from "@/components/footer/Footer";
import { PollingStationChoiceForm } from "@/components/form/data_entry/polling_station_choice/PollingStationChoiceForm";

import { DEFAULT_CANCEL_REASON, useElection, useElectionStatus } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, PageTitle } from "@kiesraad/ui";

export function DataEntryHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { election } = useElection();
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

  function closeDataEntrySavedAlert() {
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
          <PollingStationChoiceForm anotherEntry={dataEntryDone} />
        </article>
        <ElectionProgress />
      </main>
      <Footer />
    </>
  );
}
