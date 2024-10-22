import { Link } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { Button, PageTitle } from "@kiesraad/ui";

export function ElectionReportPage() {
  const { election } = useElection();
  const { statuses } = useElectionStatus();

  // Safeguard so users cannot circumvent the check via the browser's address bar
  if (statuses.some((s) => s.status !== "definitive")) {
    throw new Error("Election not ready for finalisation");
  }

  function downloadResults() {
    let filename: string;
    fetch(`/api/elections/${election.id}/download_results`)
      .then((result) => {
        if (result.status !== 200) {
          const message = `Failed to download PDF: status code ${result.status}`;

          throw new Error(message);
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
        <Link to={`/elections/${election.id}#coordinator`}>{election.name}</Link>
      </NavBar>
      <header>
        <section>
          <h1>{election.name}</h1>
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
