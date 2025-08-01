import { useState } from "react";
import { useNavigate } from "react-router";

import { AnyApiError, ApiResponseStatus, FatalApiError, isSuccess } from "@/api/ApiResult.ts";
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

import { directDownload } from "../utils/download";
import cls from "./ElectionManagement.module.css";

export function ElectionReportPage() {
  const { committeeSession, election } = useElection();
  const client = useApiClient();
  const navigate = useNavigate();
  const [changeStatusError, setChangeStatusError] = useState<AnyApiError | null>(null);

  // Safeguard so users cannot circumvent the check via the browser's address bar
  if (committeeSession.status !== "data_entry_finished") {
    throw new FatalApiError(
      ApiResponseStatus.ClientError,
      409,
      "Invalid committee session status",
      "InvalidCommitteeSessionStatus",
    );
  }

  if (changeStatusError) {
    throw changeStatusError;
  }

  function downloadPdfResults() {
    directDownload(`/api/elections/${election.id}/download_pdf_results`);
  }

  function downloadZipResults() {
    directDownload(`/api/elections/${election.id}/download_zip_results`);
  }

  function handleResume() {
    const url: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/committee_sessions/${committeeSession.id}/status`;
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry_in_progress" };
    void client
      .putRequest(url, body)
      .then((result) => {
        if (isSuccess(result)) {
          void navigate("../../status");
        } else {
          throw result;
        }
      })
      .catch(setChangeStatusError);
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
