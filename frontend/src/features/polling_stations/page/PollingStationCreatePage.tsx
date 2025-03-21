import { useNavigate } from "react-router";

import { PollingStationForm } from "@/components/form/polling_station/PollingStationForm";

import { PollingStation, useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

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
