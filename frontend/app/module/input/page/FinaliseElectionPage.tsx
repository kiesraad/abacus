import { Link } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar.tsx";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { IconChevronRight } from "@kiesraad/icon";
import { Button, PageTitle, WorkStationNumber } from "@kiesraad/ui";

export function FinaliseElectionPage() {
  const { election } = useElection();
  const { statuses } = useElectionStatus();

  // Safeguard so users cannot circumvent the check via the browser's address bar
  if (statuses.some((s) => s.status !== "Complete")) {
    throw Error("election not ready for finalisation");
  }

  function downloadResults() {
    let filename: string | undefined;
    fetch(`/api/elections/${election.id}/download_results`)
      .then((result) => {
        filename = result.headers.get("Content-Disposition")?.split('filename="')[1]?.slice(0, -1);
        return result.blob();
      })
      .then(
        (blob) => {
          const file = new File([blob], filename ?? "document");
          const objectURL = window.URL.createObjectURL(file);
          window.location.assign(objectURL);
        },
        (error) => {
          console.error(error);
        },
      );
  }

  return (
    <>
      <PageTitle title="Invoerfase afronden - Abacus" />
      <NavBar>
        <Link to={"/overview"}>Overzicht</Link>
        <IconChevronRight />
        <Link to={`/${election.id}/input`}>{election.name}</Link>
      </NavBar>
      <header>
        <section>
          <h1>{election.name}</h1>
        </section>
        <section>
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>

      <main>
        <article>
          <Button onClick={downloadResults}>Download proces-verbaal</Button>
        </article>
      </main>
    </>
  );
}
