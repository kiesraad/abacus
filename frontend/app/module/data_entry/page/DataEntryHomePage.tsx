import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ElectionProgress } from "app/component/election/ElectionProgress";
import { Footer } from "app/component/footer/Footer";
import { PollingStationChoiceForm } from "app/component/form/data_entry/polling_station_choice/PollingStationChoiceForm";
import { NavBar } from "app/component/navbar/NavBar";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { Alert, PageTitle, WorkStationNumber } from "@kiesraad/ui";

export function DataEntryHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { election } = useElection();
  const { statuses, refetch } = useElectionStatus();

  // re-fetch statuses when component mounts
  useEffect(() => {
    console.log("DataEntryHomePage: refetching statuses");
    refetch();
  }, []);

  const showDataEntrySavedAlert = location.hash === "#data-entry-saved";

  function closeDataEntrySavedAlert() {
    navigate(location.pathname);
  }

  return (
    <>
      <PageTitle title="Kies een stembureau - Abacus" />
      <NavBar>
        <Link to={"/elections"}>Overzicht</Link>
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
      {statuses.length > 0 && statuses.every((s) => s.status === "definitive") && (
        <Alert type="success">
          <h2>Alle stembureaus zijn ingevoerd</h2>
          <p>Bedankt voor je hulp!</p>
          <p>
            De resultaten van alle stembureaus kunnen nu opgeteld gaan worden om de uitslag van de {election.name} vast
            te stellen.
          </p>
          <p>Wacht op instructies van de coördinator.</p>
        </Alert>
      )}
      <main>
        <article id="polling-station-choice-form">
          <PollingStationChoiceForm anotherEntry={showDataEntrySavedAlert} />
        </article>
        <ElectionProgress />
      </main>
      <Footer />
    </>
  );
}
