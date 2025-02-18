import { Footer } from "app/component/footer/Footer";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { Button, FormLayout, PageTitle } from "@kiesraad/ui";

import cls from "./ElectionReportPage.module.css";

// Prompt the user to 'download' (i.e. save) a file
function offerDownload(blob: Blob, filename: string) {
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
}

// Download a file from a URL and offer a download prompt to the user with the result
async function downloadFrom(url: string) {
  let filename: string;

  try {
    const res = await fetch(url);
    if (res.status !== 200) {
      const message = `Download failed: status code ${res.status}`;
      throw new Error(message);
    }
    filename = res.headers.get("Content-Disposition")?.split('filename="')[1]?.slice(0, -1) ?? "document";
    offerDownload(await res.blob(), filename);
  } catch (e) {
    console.error(e);
  }
}

export function ElectionReportPage() {
  const { election } = useElection();
  const { statuses } = useElectionStatus();

  // Safeguard so users cannot circumvent the check via the browser's address bar
  if (statuses.some((s) => s.status !== "definitive")) {
    throw new Error("Election not ready for finalisation");
  }

  function downloadPdfResults() {
    void downloadFrom(`/api/elections/${election.id}/download_pdf_results`);
  }

  function downloadZipResults() {
    void downloadFrom(`/api/elections/${election.id}/download_zip_results`);
  }

  return (
    <>
      <PageTitle title={`${t("election.title.finish_data_entry")} - Abacus`} />
      <header>
        <section>
          <h1>{t("election_status.finish_data_entry_first_session")}</h1>
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
          <FormLayout.Controls>
            <Button onClick={downloadZipResults}>{t("election_report.download_zip")}</Button>
            <Button variant="secondary" onClick={downloadPdfResults}>
              {t("election_report.download_report")}
            </Button>
          </FormLayout.Controls>
        </article>
      </main>
      <Footer />
    </>
  );
}
