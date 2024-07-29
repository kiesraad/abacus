import { useState } from "react";

import { PollingStationChoiceForm } from "app/component/form/polling_station_choice/PollingStationChoiceForm.tsx";

import { useElection } from "@kiesraad/api";
import { Alert, WorkStationNumber } from "@kiesraad/ui";

export function InputHomePage() {
  const { election } = useElection();
  const [showAlert, setShowAlert] = useState(true);

  function hideAlert() {
    setShowAlert(!showAlert);
  }

  return (
    <>
      <header>
        <section>
          <h1>{election.name}</h1>
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
        <nav id="progress">
          <h2 className="form_title">Voortgang</h2>
          {/* TODO: Add Progress bars */}
        </nav>
      </main>
    </>
  );
}
