import { useNavigate } from "react-router";

import { PageTitle } from "@kiesraad/ui";

import { useElection } from "@/hooks/election/useElection";
import { PollingStation } from "@/types/generated/openapi";
import { t } from "@/utils/i18n/i18n";

import { PollingStationForm } from "./PollingStationForm";

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
