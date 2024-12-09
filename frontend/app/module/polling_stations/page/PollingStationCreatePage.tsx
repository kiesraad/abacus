import { useNavigate } from "react-router-dom";

import { PollingStationForm } from "app/component/form/polling_station/PollingStationForm";

import { PollingStation } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

export function PollingStationCreatePage() {
  const electionId = useNumericParam("electionId");
  const navigate = useNavigate();

  const handleSaved = (ps: PollingStation) => {
    navigate(`../?created=${ps.id}`);
  };

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
          <PollingStationForm electionId={electionId} onSaved={handleSaved} />
        </article>
      </main>
    </>
  );
}
