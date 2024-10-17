import { Link, useNavigate } from "react-router-dom";

import { ElectionProgress } from "app/component/election/ElectionProgress";
import { NavBar } from "app/component/navbar/NavBar";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { Alert, Button, PageTitle } from "@kiesraad/ui";

export function ElectionStatusPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { statuses } = useElectionStatus();

  function finishInput() {
    navigate("../report#coordinator");
  }

  return (
    <>
      <PageTitle title="Status verkiezing - Abacus" />
      <NavBar>
        <Link to={`/elections/${election.id}#coordinator`}>{election.name}</Link>
      </NavBar>
      <header>
        <section>
          <h1>Eerste zitting</h1>
        </section>
      </header>
      {statuses.every((s) => s.status === "definitive") && (
        <Alert type="success">
          <h2>Alle stembureaus zijn twee keer ingevoerd</h2>
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
        <nav id="progress">
          <h2>Snelkoppelingen</h2>

          <h2>Voortgang</h2>
          <ElectionProgress />
        </nav>
        <article>Placeholder</article>
      </main>
    </>
  );
}
