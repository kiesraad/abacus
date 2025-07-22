import { useNavigate } from "react-router";

import { ApiResponseStatus, FatalApiError } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
} from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";
import { formatFullDateWithoutTimezone } from "@/utils/format";

import cls from "./ElectionManagement.module.css";

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
  const { committeeSession, election } = useElection();
  const client = useApiClient();
  const navigate = useNavigate();

  // Safeguard so users cannot circumvent the check via the browser's address bar
  if (committeeSession.status !== "data_entry_finished") {
    throw new FatalApiError(
      ApiResponseStatus.ClientError,
      403,
      "Committee session should have status DataEntryFinished",
      "Forbidden",
    );
  }

  function downloadPdfResults() {
    void downloadFrom(`/api/elections/${election.id}/download_pdf_results`);
  }

  function downloadZipResults() {
    void downloadFrom(`/api/elections/${election.id}/download_zip_results`);
  }

  function handleResume() {
    const url: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/committee_sessions/${committeeSession.id}/status`;
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry_in_progress" };
    void client.putRequest(url, body).then(() => {
      void navigate("../../status");
    });
  }

  return (
    <>
      <PageTitle title={`${t("election.title.finish_data_entry")} - Abacus`} />
      <header>
        <section>
          <h1>{committeeSessionLabel(committeeSession.number)}</h1>
        </section>
      </header>
      <main>
        <article>
          <h2 className="form_title">
            {t("election_report.counting_results")} {committeeSessionLabel(committeeSession.number).toLowerCase()}{" "}
            {t("municipality").toLowerCase()} {election.location}
          </h2>
          <div className={cls.reportInfoSection}>
            {t("election_report.committee_session_started", {
              date: committeeSession.start_date
                ? formatFullDateWithoutTimezone(new Date(committeeSession.start_date))
                : "",
              time: committeeSession.start_time,
            })}
            .<br />
            {t("election_report.there_was_counting_method", { method: t(election.counting_method).toLowerCase() })}.
          </div>
          <div className={cls.reportInfoSection}>
            <Button onClick={downloadZipResults}>{t("election_report.download_zip")}</Button>
            <br />
            <br />
            <Button variant="secondary" onClick={downloadPdfResults}>
              {t("election_report.download_report")}
            </Button>
          </div>
          <FormLayout.Controls>
            <Button.Link to="../..">{t("election_report.back_to_overview")}</Button.Link>
            <Button variant="secondary" onClick={handleResume}>
              {t("election_report.resume_data_entry")}
            </Button>
          </FormLayout.Controls>
        </article>
      </main>
      <Footer />
    </>
  );
}
