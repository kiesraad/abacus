import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { PollingStationChoiceForm } from "app/component/form/data_entry/polling_station_choice/PollingStationChoiceForm";
import { NavBar } from "app/component/navbar/NavBar";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { Alert, Button, PageTitle, WorkStationNumber } from "@kiesraad/ui";

export function DataEntryHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { election } = useElection();
  const { statuses, refetch } = useElectionStatus();

  // re-fetch statuses when component mounts
  useEffect(() => {
    refetch();
  }, [refetch]);

  const showDataEntrySavedAlert = location.hash === "#data-entry-saved";

  function closeDataEntrySavedAlert() {
    navigate({ hash: "" });
  }

  function finishInput() {
    navigate("finalise");
  }

  return (
    <>
      <PageTitle title="Kies een stembureau - Abacus" />
      <NavBar>
        <Link to={"/overview"}>Overzicht</Link>
      </NavBar>
      <header>
        <section>
          <h1>{election.name}</h1>
        </section>
        <section>
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>
      {showDataEntrySavedAlert && (
        <Alert type="success" onClose={closeDataEntrySavedAlert}>
          <h2>Je invoer is opgeslagen</h2>
          <p>
            Geef het papieren proces verbaal terug aan de coördinator.
            <br />
            Een andere invoerder doet straks de tweede invoer.
          </p>
        </Alert>
      )}
      {statuses.every((s) => s.status === "definitive") && (
        <Alert type="success">
          <h2>Alle stembureaus zijn ingevoerd</h2>
          <p>
            De resultaten van alle stembureaus in jouw gemeente zijn correct ingevoerd. Je kunt de uitslag nu definitief
            maken en het proces verbaal opmaken. Doe dit alleen als er vandaag niks meer herteld hoeft te worden.
          </p>
          <Button onClick={finishInput} size="md">
            Invoerfase afronden
          </Button>
        </Alert>
      )}
      <main>
        <article id="polling-station-choice-form">
          <PollingStationChoiceForm anotherEntry={showDataEntrySavedAlert} />
        </article>
        <nav id="progress">
          <h2 className="form_title">Voortgang</h2>
          {/* TODO: Add Progress bars */}
        </nav>
      </main>
    </>
  );
}
