import { Alert, WorkStationNumber } from "@kiesraad/ui";
import { PollingStationChoiceForm } from "app/component/form/polling_station_choice/PollingStationChoiceForm.tsx";
import { useState } from "react";

export function InputHomePage() {
  const [showAlert, setShowAlert] = useState(true);

  function hideAlert() {
    setShowAlert(!showAlert);
  }

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
      {showAlert && (
        <Alert type="success" onClose={hideAlert}>
          <h2>Je account is ingesteld</h2>
          <p>
            Zodra je een tellijst van een stembureau hebt gekregen kan je beginnen met invoeren.
          </p>
        </Alert>
      )}
      <main>
        <article>
          <PollingStationChoiceForm />
        </article>
      </main>
    </>
  );
}
