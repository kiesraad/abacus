import { WorkStationNumber } from "@kiesraad/ui";
import { PollingStationChoiceForm } from "app/component/form/polling_station_choice/PollingStationChoiceForm.tsx";

export function InputHomePage() {
  return (
    <>
      <header>
        <section>
          <h1>Verkiezingsnaam</h1>
        </section>
        <section>
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>
      <main>
        <article>
          {/* TODO: Add alert here with below text */}
          <strong>Je account is ingesteld</strong>
          <br />
          Zodra je een tellijst van een stembureau hebt gekregen kan je beginnen met invoeren.{" "}
          <br />
          <br />
          <br />
          <PollingStationChoiceForm />
        </article>
      </main>
    </>
  );
}
