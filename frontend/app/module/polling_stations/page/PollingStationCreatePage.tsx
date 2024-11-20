import { useNavigate } from "react-router-dom";

import { PollingStationForm } from "app/component/form/polling_station/PollingStationForm";

import { PollingStation } from "@kiesraad/api";
import { PageTitle } from "@kiesraad/ui";

export function PollingStationCreatePage() {
  const navigate = useNavigate();
  const onSave = (ps: PollingStation) => {
    navigate(`../?created=${ps.id}`);
  };

  return (
    <>
      <PageTitle title="Stembureaus - Abacus" />
      <header>
        <section>
          <h1>Stembureau toevoegen</h1>
        </section>
      </header>
      <main>
        <article>
          <PollingStationForm electionId={1} onSaved={onSave} />
        </article>
      </main>
    </>
  );
}
