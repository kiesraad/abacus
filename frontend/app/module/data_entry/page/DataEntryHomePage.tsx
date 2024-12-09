import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ElectionProgress } from "app/component/election/ElectionProgress";
import { Footer } from "app/component/footer/Footer";
import { PollingStationChoiceForm } from "app/component/form/data_entry/polling_station_choice/PollingStationChoiceForm";
import { NavBar } from "app/component/navbar/NavBar";

import { DEFAULT_CANCEL_REASON, useElection, useElectionStatus } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, PageTitle, WorkStationNumber } from "@kiesraad/ui";

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

  const showDataEntrySavedAlert = location.hash === "#data-entry-saved";

  function closeDataEntrySavedAlert() {
    navigate(location.pathname);
  }

  return (
    <>
      <PageTitle title={`${t("data_entry.pick_polling_sation")} - Abacus`} />
      <NavBar>
        <Link to={"/elections"}>{t("overview")}</Link>
      </NavBar>
      <header>
        <section>
          <h1>{election.name}</h1>
        </section>
        <section>
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>
      {showDataEntrySavedAlert && (
        <Alert type="success" onClose={closeDataEntrySavedAlert}>
          <h2>{t("data_entry.entry_saved")}</h2>
          <p>
            {t("data_entry.success.return_paper")}
            <br />
            {t("data_entry.success.second_entry_info")}
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
          <PollingStationChoiceForm anotherEntry={showDataEntrySavedAlert} />
        </article>
        <ElectionProgress />
      </main>
      <Footer />
    </>
  );
}
