import { Link } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { IconChevronRight } from "@kiesraad/icon";
import { Button, PageTitle, WorkStationNumber } from "@kiesraad/ui";

export function FinaliseElectionPage() {
  const { election } = useElection();
  const { statuses } = useElectionStatus();

  // Safeguard so users cannot circumvent the check via the browser's address bar
  if (statuses.some((s) => s.status !== "definitive")) {
    throw Error("election not ready for finalisation");
  }

  function downloadResults() {
    let filename: string;
    fetch(`/api/elections/${election.id}/download_results`)
      .then((result) => {
        if (result.status !== 200) {
          // TODO: #277 handle error according to design
          const message = `Failed to download PDF: status code ${result.status}`;
          alert(message);
          throw Error(message);
        }
        filename = result.headers.get("Content-Disposition")?.split('filename="')[1]?.slice(0, -1) ?? "document";
        return result.blob();
      })
      .then(
        (blob) => {
          const file = new File([blob], filename);
          const fileUrl = window.URL.createObjectURL(file);
          const anchorElement = document.createElement("a");

          anchorElement.href = fileUrl;
          anchorElement.download = filename;
          anchorElement.hidden = true;

          document.body.appendChild(anchorElement);

          anchorElement.click();
          anchorElement.remove();

          setTimeout(() => {
            window.URL.revokeObjectURL(fileUrl);
          }, 30000);
        },
        (error: unknown) => {
          console.error(error);
        },
      );
  }

  return (
    <>
      <PageTitle title="Invoerfase afronden - Abacus" />
      <NavBar>
        <Link to={"/overview"}>Overzicht</Link>
        <IconChevronRight style={{ fill: "white" }} />
        <Link to={`/elections/${election.id}/data-entry`}>{election.name}</Link>
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
