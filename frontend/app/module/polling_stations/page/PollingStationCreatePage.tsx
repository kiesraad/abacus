import { PollingStationForm } from "app/component/form/polling_station/PollingStationForm";

import { PageTitle } from "@kiesraad/ui";

export function PollingStationCreatePage() {
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
          <PollingStationForm />
        </article>
      </main>
    </>
  );
}
