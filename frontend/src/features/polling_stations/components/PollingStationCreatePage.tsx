import { useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { t } from "@/i18n/translate";
import { PollingStation } from "@/types/generated/openapi";

import { PollingStationForm } from "./PollingStationForm";

export function PollingStationCreatePage() {
  const { election } = useElection();
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
      <PageTitle title={`${t("polling_stations")} - Abacus`} />
      <header>
        <section>
          <h1>{t("polling_station.create")}</h1>
        </section>
      </header>
      <main>
        <article>
          <PollingStationForm electionId={election.id} onSaved={handleSaved} />
        </article>
      </main>
    </>
  );
}
