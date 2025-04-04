import { useNavigate } from "react-router";

import { PollingStation, useElection } from "@/api";
import { PageTitle } from "@/components/ui";
import { PollingStationForm } from "@/features/polling_stations/components/PollingStationForm";
import { t } from "@/lib/i18n";

export function PollingStationCreatePage() {
  const { election } = useElection();
  const navigate = useNavigate();

  const parentUrl = `/elections/${election.id}/polling-stations`;

  function handleSaved(ps: PollingStation) {
    void navigate(`${parentUrl}?created=${ps.id}`);
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
