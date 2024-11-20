import { Link } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { IconLock } from "@kiesraad/icon";
import { Button, Icon, PageTitle } from "@kiesraad/ui";

import cls from "./ElectionReportPage.module.css";

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
        <Link to={`/elections/${election.id}#coordinator`}>
          <span className="bold">{election.location}</span>
          <span>&mdash;</span>
          <span>{election.name}</span>
        </Link>
      </NavBar>
      <header>
        <section>
          <h1>{t("election_status.first_session")}</h1>
        </section>
        <section>
          <div className="election_status">
            <span>{tx("election_status.finish_first_session_data_entry_status")}</span>{" "}
            <Icon size="md" color="error" icon={<IconLock />} />
          </div>
        </section>
      </header>
      <main>
        <article>
          <h2 className="form_title">{t("election_report.finish_data_entry_phase")}</h2>
          <div className={cls.reportInfoSection}>
            {t("election_report.about_to_stop_data_entry")}
            {tx("election_report.data_entry_finish_steps_explanation")}
            {t("election_report.for_recount_new_session_needed")}
          </div>
          <Button onClick={downloadResults}>{t("election_report.download_report")}</Button>
        </article>
      </main>
    </>
  );
}
