import { Navigate, useNavigate } from "react-router";

import { ApplicationError, isSuccess, NotFoundError } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Footer } from "@/components/footer/Footer";
import { IconCheckVerified } from "@/components/generated/icons";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { DownloadButton } from "@/components/ui/DownloadButton/DownloadButton";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Icon } from "@/components/ui/Icon/Icon";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t, tx } from "@/i18n/translate";
import {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
} from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { committeeSessionLabel } from "@/utils/committeeSession";
import { formatFullDateWithoutTimezone } from "@/utils/dateTime";

import cls from "../ElectionManagement.module.css";

export function ElectionReportPage() {
  const { currentCommitteeSession, committeeSessions, election, investigations } = useElection();
  const navigate = useNavigate();
  const committeeSessionId = useNumericParam("committeeSessionId");
  const committeeSession = committeeSessions.find((session) => session.id === committeeSessionId);
  const updatePath: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/committee_sessions/${committeeSessionId}/status`;
  const { update, isLoading } = useCrud({ updatePath, throwAllErrors: true });

  if (!committeeSession) {
    throw new NotFoundError("error.not_found");
  }

  const sessionLabel = committeeSessionLabel(committeeSession.number);

  // Redirect to update details page if committee session details have not been filled in
  if (committeeSession.location === "" || !committeeSession.start_date_time) {
    return <Navigate to={`/elections/${election.id}/details#redirect-to-report`} />;
  }

  // Safeguard so users cannot circumvent the check via the browser's address bar
  if (committeeSession.status !== "data_entry_finished") {
    throw new ApplicationError(t("error.forbidden_message"), "InvalidCommitteeSessionStatus");
  }

  const isFirstCommitteeSession = currentCommitteeSession.number === 1;

  const wasCorrected = investigations.some((i) => i.corrected_results);

  function handleResume() {
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry_in_progress" };
    void update(body).then((result) => {
      if (isSuccess(result)) {
        void navigate("../../status");
      }
    });
  }

  return (
    <>
      <PageTitle title={`${t("election.title.finish_data_entry")} - Abacus`} />
      <header>
        <section>
          <h1>
            {/* TODO: Change to conditional GSB/HSB/CSB when implemented */}
            {sessionLabel} {t("GSB").replace(/(^\w|\s\w)/g, (m) => m.toUpperCase())}
          </h1>
        </section>
      </header>
      <main className={cls.reportMain}>
        <article>
          <div>
            <Icon size="lg" color="default" icon={<IconCheckVerified />} />
          </div>
          <div>
            <h2 className="form_title">
              {t("election_report.counting_results")} {sessionLabel.toLowerCase()}{" "}
              {/* TODO: Change to conditional GSB/HSB/CSB when implemented */}
              {t("GSB").toLowerCase()} {t("municipality").toLowerCase()} {election.location}
            </h2>
            <div className={cls.reportInfoSection}>
              {t("election_report.committee_session_started", {
                date: committeeSession.start_date_time
                  ? formatFullDateWithoutTimezone(new Date(committeeSession.start_date_time))
                  : "",
                time: committeeSession.start_date_time
                  ? new Date(committeeSession.start_date_time).toLocaleTimeString("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "",
              })}
              .<br />
              {t("election_report.there_was_counting_method", { method: t(election.counting_method).toLowerCase() })}.
              <DownloadButton
                icon="download"
                href={`/api/elections/${election.id}/committee_sessions/${committeeSession.id}/download_zip_results`}
                title={t("election_management.download_definitive_documents", {
                  sessionLabel: sessionLabel.toLowerCase(),
                })}
                subtitle={t("election_management.zip_file")}
              />
            </div>
            <section className={cn(cls.reportInfoSection, "sm")}>
              <h3>{t("election_management.what_now")}?</h3>
              <p>{t("election_management.download_definitive_files")}</p>
              <section className="sm">
                <p>
                  {t(
                    isFirstCommitteeSession
                      ? "election_management.first_session.zip_file_explanation"
                      : wasCorrected
                        ? "election_management.next_session.with_corrections.zip_file_explanation"
                        : "election_management.next_session.without_corrections.zip_file_explanation",
                  )}
                </p>
                <ol className={cls.list}>
                  {tx(
                    isFirstCommitteeSession
                      ? "election_management.first_session.documents"
                      : wasCorrected
                        ? "election_management.next_session.with_corrections.documents"
                        : "election_management.next_session.without_corrections.documents",
                  )}
                </ol>
                <p>{t("election_management.upload_the_zip")}</p>
              </section>
            </section>

            <FormLayout.Controls>
              <Button.Link to="../..">{t("back_to_overview")}</Button.Link>
              {currentCommitteeSession.id === committeeSession.id && (
                <Button variant="secondary" onClick={handleResume} disabled={isLoading}>
                  {t("election_report.resume_data_entry")}
                </Button>
              )}
            </FormLayout.Controls>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
