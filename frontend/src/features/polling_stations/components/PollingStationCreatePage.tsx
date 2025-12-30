import { useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { t } from "@/i18n/translate";
import type { PollingStation } from "@/types/generated/openapi";

import { PollingStationAlert } from "./PollingStationAlert";
import { PollingStationForm } from "./PollingStationForm";

export function PollingStationCreatePage() {
  const { currentCommitteeSession, election, refetch } = useElection();
  const { pushMessage } = useMessages();
  const navigate = useNavigate();

  const parentUrl = `/elections/${election.id}/polling-stations`;

  function handleSaved(pollingStation: PollingStation) {
    if (currentCommitteeSession.status === "data_entry_finished") {
      pushMessage({
        type: "warning",
        title: t("generate_new_results"),
        text: `${t("polling_station.message.polling_station_created", {
          number: pollingStation.number,
          name: pollingStation.name,
        })}. ${t("documents_are_invalidated")}`,
      });
    } else {
      pushMessage({
        title: t("polling_station.message.polling_station_created", {
          number: pollingStation.number,
          name: pollingStation.name,
        }),
      });
    }
    void refetch();
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
      <PollingStationAlert />
      <main>
        <article>
          <PollingStationForm electionId={election.id} onSaved={handleSaved} />
        </article>
      </main>
    </>
  );
}
