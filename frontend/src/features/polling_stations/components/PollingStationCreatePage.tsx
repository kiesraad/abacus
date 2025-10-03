import { useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { t } from "@/i18n/translate";
import { PollingStation } from "@/types/generated/openapi";

import { PollingStationForm } from "./PollingStationForm";

export function PollingStationCreatePage() {
  const { currentCommitteeSession, election } = useElection();
  const { pushMessage } = useMessages();
  const navigate = useNavigate();

  const parentUrl = `/elections/${election.id}/polling-stations`;

  function handleSaved(pollingStation: PollingStation) {
    pushMessage({
      title: t("polling_station.message.polling_station_created", {
        number: pollingStation.number,
        name: pollingStation.name,
      }),
    });

    void navigate(parentUrl);
  }

  return (
    <>
      <PageTitle title={`${t("polling_station.title.plural")} - Abacus`} />
      <header>
        <section>
          <h1>{t("polling_station.create")}</h1>
        </section>
      </header>
      {currentCommitteeSession.status === "data_entry_finished" && (
        <Alert type="warning">
          <strong className="heading-md">{t("polling_station.warning_data_entry_finished.title")}</strong>
          <p>{t("polling_station.warning_data_entry_finished.description")}</p>
        </Alert>
      )}
      <main>
        <article>
          <PollingStationForm electionId={election.id} onSaved={handleSaved} />
        </article>
      </main>
    </>
  );
}
