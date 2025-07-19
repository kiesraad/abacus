import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { HeaderCommitteeSessionStatusWithIcon } from "@/components/committee_session/CommitteeSessionStatus";
import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { useUserRole } from "@/hooks/user/useUserRole";
import { useUsers } from "@/hooks/user/useUsers";
import { t } from "@/i18n/translate";
import { committeeSessionLabel } from "@/utils/committeeSession";

import { ElectionStatus } from "./ElectionStatus";

export function ElectionStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { committeeSession, election, pollingStations, refetch } = useElection();
  const { statuses } = useElectionStatus();
  const { isCoordinator } = useUserRole();
  const { getName } = useUsers();

  // re-fetch election when component mounts
  useEffect(() => {
    const abortController = new AbortController();

    void refetch(abortController);

    return () => {
      abortController.abort(DEFAULT_CANCEL_REASON);
    };
  }, [refetch]);

  const showDataEntryKeptAlert = location.hash.startsWith("#data-entry-kept-") ? location.hash : null;
  const showDataEntriesDiscardedAlert = location.hash.startsWith("#data-entries-discarded-") ? location.hash : null;
  const showFirstEntryResumedAlert = location.hash.startsWith("#data-entry-resumed-") ? location.hash : null;
  const showFirstEntryDiscardedAlert = location.hash.startsWith("#data-entry-discarded-") ? location.hash : null;
  const successAlert =
    showDataEntryKeptAlert ||
    showDataEntriesDiscardedAlert ||
    showFirstEntryResumedAlert ||
    showFirstEntryDiscardedAlert ||
    undefined;

  let pollingStationNumber = 0;
  let typist = "";
  if (successAlert) {
    const id = parseInt(successAlert.substring(successAlert.lastIndexOf("-") + 1));
    pollingStationNumber = pollingStations.find((ps) => ps.id === id)?.number ?? 0;
    const typistId = statuses.find((status) => status.polling_station_id === id)?.first_entry_user_id;
    typist = getName(typistId);
  }

  function finishDataEntry() {
    void navigate("../report");
  }

  function closeSuccessAlert() {
    void navigate(location.pathname);
  }

  return (
    <>
      <PageTitle title={`${t("election_status.title")} - Abacus`} />
      <header>
        <section>
          <h1>{committeeSessionLabel(committeeSession.number)}</h1>
        </section>
        <section>
          <div className="election_status">
            <HeaderCommitteeSessionStatusWithIcon status={committeeSession.status} userRole="coordinator" />
          </div>
        </section>
      </header>
      {successAlert && (
        <Alert type="success" onClose={closeSuccessAlert}>
          <h2>
            {showFirstEntryDiscardedAlert
              ? t("election_status.success.data_entry_discarded", { nr: pollingStationNumber })
              : showFirstEntryResumedAlert
                ? t("election_status.success.data_entry_resumed", { nr: pollingStationNumber, typist: typist })
                : t("election_status.success.differences_resolved", { nr: pollingStationNumber })}
          </h2>
          <p>
            {showFirstEntryDiscardedAlert
              ? t("election_status.success.polling_station_can_be_filled_again")
              : showFirstEntryResumedAlert
                ? t("election_status.success.typist_can_continue_data_entry")
                : showDataEntryKeptAlert
                  ? t("election_status.success.data_entry_kept", { typist: typist })
                  : t("election_status.success.data_entries_discarded", { nr: pollingStationNumber })}
          </p>
        </Alert>
      )}
      {committeeSession.status !== "data_entry_finished" &&
        statuses.length > 0 &&
        statuses.every((s) => s.status === "definitive") && (
          <Alert type="success">
            <h2>{t("election_status.definitive.title")}</h2>
            <p>{t("election_status.definitive.message")}</p>
            <Button onClick={finishDataEntry} size="md">
              {t("election_status.definitive.finish_button")}
            </Button>
          </Alert>
        )}
      <main>
        <ElectionStatus
          election={election}
          pollingStations={pollingStations}
          statuses={statuses}
          addLinks={
            isCoordinator &&
            (committeeSession.status === "data_entry_in_progress" || committeeSession.status === "data_entry_paused")
          }
          navigate={(path) => void navigate(path)}
        />
      </main>
      <Footer />
    </>
  );
}
