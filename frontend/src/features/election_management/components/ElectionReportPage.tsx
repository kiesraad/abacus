import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { t, tx } from "@/i18n/translate";

import { downloadFrom } from "../utils/download";
import cls from "./ElectionManagement.module.css";

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
          <h1>{t("election_report.finish_data_entry_current_session")}</h1>
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
