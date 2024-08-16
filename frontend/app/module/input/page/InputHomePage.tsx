import { Link, useNavigate } from "react-router-dom";

import { PollingStationChoiceForm } from "app/component/form/polling_station_choice/PollingStationChoiceForm";
import { NavBar } from "app/component/navbar/NavBar.tsx";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { Alert, Button, PageTitle, WorkStationNumber } from "@kiesraad/ui";

export function InputHomePage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { statuses } = useElectionStatus();

  function finishInput() {
    navigate("/");
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
      {statuses.every((s) => s.status === "Complete") && (
        <Alert type="success">
          <h2>Alle stembureaus zijn twee keer ingevoerd</h2>
          <p>
            De resultaten van alle stembureaus in jouw gemeente zijn correct ingevoerd. Je kunt de
            uitslag nu definitief maken en het proces verbaal opmaken. Doe dit alleen als er vandaag
            niks meer herteld hoeft te worden.
          </p>
          <Button onClick={finishInput} size="md">
            Invoer afronden
          </Button>
        </Alert>
      )}
      <main>
        <article id="polling-station-choice-form">
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
