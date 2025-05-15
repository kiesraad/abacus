import { useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import { PollingStation } from "@/types/generated/openapi";

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
