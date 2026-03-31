import { useLocation } from "react-router";
import { CommitteeSessionPausedModal } from "@/components/data_entry/CommitteeSessionPausedModal";
import { Footer } from "@/components/footer/Footer";
import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { CollapsibleDataEntryList } from "@/features/data_entry_home/components/CollapsibleDataEntryList";
import { DataEntryList } from "@/features/data_entry_home/components/DataEntryList";
import { UnfinishedEntriesList } from "@/features/data_entry_home/components/UnfinishedEntriesList";
import { useAvailableDataEntries } from "@/features/data_entry_home/hooks/useAvailableDataEntries";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { useLiveData } from "@/hooks/useLiveData";
import { t } from "@/i18n/translate";
import { DataEntryPicker } from "./DataEntryPicker";
import { ElectionProgress } from "./ElectionProgress";

export function DataEntryHomePage() {
  const location = useLocation();
  const { currentCommitteeSession, election, refetch: refetchElection } = useElection();
  const { statuses, refetch: refetchStatuses } = useElectionStatus();
  const { dataEntryWithStatus, availableCurrentUser, inProgressCurrentUser } = useAvailableDataEntries();

  // live data polling (initial fetch + 30s interval + visibility change)
  useLiveData(refetchStatuses, true);
  useLiveData(refetchElection, true);

  return (
    <>
      <PageTitle title={`${t("data_entry.pick_polling_station")} - Abacus`} />
      <header>
        <section>
          <h1>{election.name}</h1>
        </section>
      </header>

      {currentCommitteeSession.status === "paused" && (
        <CommitteeSessionPausedModal committeeCategory={election.committee_category} />
      )}

      <Messages />

      {statuses.length > 0 && statuses.every((s) => s.status === "definitive") && (
        <Alert type="success">
          <strong className="heading-md">{t("data_entry.completed.all_entries_completed")}</strong>
          <p>{t("data_entry.completed.thank_you")}</p>
          <p>{t("data_entry.completed.info", { electionName: election.name })}</p>
          <p>{t("data_entry.completed.wait_for_instructions")}</p>
        </Alert>
      )}
      <main>
        <article>
          <fieldset>
            <legend className="mb-sm">
              <h2>
                {location.hash === "#next" ? t("data_entry_home.insert_another") : t("data_entry_home.insert_title")}
              </h2>
            </legend>

            <UnfinishedEntriesList electionId={election.id} dataEntries={inProgressCurrentUser} />

            {election.committee_category === "GSB" ? (
              <>
                <DataEntryPicker dataEntryWithStatus={dataEntryWithStatus} />
                <CollapsibleDataEntryList
                  electionId={election.id}
                  availableDataEntries={availableCurrentUser}
                  onToggle={() => void refetchStatuses()}
                />
              </>
            ) : (
              <DataEntryList electionId={election.id} dataEntries={availableCurrentUser} />
            )}
          </fieldset>
        </article>
        <ElectionProgress />
      </main>
      <Footer />
    </>
  );
}
