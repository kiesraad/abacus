import { useState } from "react";
import { Navigate } from "react-router";
import { ApplicationError, NotFoundError } from "@/api/ApiResult";
import { Footer } from "@/components/footer/Footer";
import { IconCheckVerified } from "@/components/generated/icons";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { DownloadButton } from "@/components/ui/DownloadButton/DownloadButton";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Icon } from "@/components/ui/Icon/Icon";
import { ResumeDataEntryModal } from "@/features/election_management/components/report/ResumeDataEntryModal";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { cn } from "@/utils/classnames";
import { committeeSessionLabel } from "@/utils/committeeSession";
import { formatDateTimeFull } from "@/utils/dateTime";
import cls from "../ElectionManagement.module.css";
import { CSBElectionReportSection } from "./CSBElectionReportSection";
import { GSBElectionReportSection } from "./GSBElectionReportSection";

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function ElectionReportPage() {
  const { currentCommitteeSession, committeeSessions, election } = useElection();
  const committeeSessionId = useNumericParam("committeeSessionId");
  const committeeSession = committeeSessions.find((session) => session.id === committeeSessionId);
  if (!committeeSession) {
    throw new NotFoundError("error.not_found");
  }
  const [showModal, setShowModal] = useState(false);

  const sessionLabel = committeeSessionLabel(election.committee_category, committeeSession.number);

  const closeModal = () => {
    setShowModal(false);
  };

  // Redirect to update details page if committee session details have not been filled in
  if (committeeSession.location === "" || !committeeSession.start_date_time) {
    return <Navigate to={`/elections/${election.id}/details#redirect-to-report`} />;
  }

  // Safeguard so users cannot circumvent the check via the browser's address bar
  // TODO: Issue #3154: Add check for final apportionment state for CSB election
  if (committeeSession.status !== "completed") {
    throw new ApplicationError(t("error.forbidden_message"), "InvalidCommitteeSessionStatus");
  }

  function handleResume() {
    setShowModal(true);
  }

  function pageTitle() {
    return `
      ${election.committee_category === "CSB" ? t("election_report.report") : sessionLabel} 
      ${t(`committee_category.${election.committee_category}.short`).replace(/(^\w|\s\w)/g, (m) => m.toLowerCase())}
    `;
  }

  function formTitle() {
    if (election.committee_category === "CSB") {
      return (
        <>
          {t("apportionment.title")} {t("municipality").toLowerCase()} {election.location}
        </>
      );
    }

    return `
      ${t("election_report.counting_results")} ${sessionLabel.toLowerCase()} 
      ${t(`committee_category.${election.committee_category}.short`).toLowerCase()} ${t("municipality").toLowerCase()} 
      ${election.location}
    `;
  }

  return (
    <>
      <PageTitle title={`${pageTitle()} - Abacus`} />
      <header>
        <section>
          <h1>{pageTitle()}</h1>
        </section>
      </header>
      <main className={cls.reportMain}>
        <article>
          <div>
            <Icon size="lg" color="default" icon={<IconCheckVerified />} />
          </div>
          <div>
            <h2 className="form_title">{formTitle()}</h2>
            <div className={cls.reportInfoSection}>
              {t("election_report.committee_session_started", {
                date_time: committeeSession.start_date_time
                  ? formatDateTimeFull(new Date(committeeSession.start_date_time))
                  : "",
              })}
              .
              {election.committee_category === "GSB" && (
                <>
                  {election.counting_method && (
                    <>
                      <br />
                      {t("election_report.there_was_counting_method", {
                        method: t(election.counting_method).toLowerCase(),
                      })}
                      .
                    </>
                  )}
                  <DownloadButton
                    icon="download"
                    href={`/api/elections/${election.id}/committee_sessions/${committeeSession.id}/download_zip_results`}
                    title={t(`election_management.GSB.download_definitive_documents`, {
                      sessionLabel: sessionLabel.toLowerCase(),
                    })}
                    subtitle={t("election_management.zip_file")}
                  />
                </>
              )}
              {election.committee_category === "CSB" && (
                <>
                  <DownloadButton
                    icon="download"
                    href={`/api/elections/${election.id}/committee_sessions/${committeeSession.id}/download_zip_results_csb`}
                    title={t("election_management.CSB.determination_election_results.download")}
                    subtitle={t("election_management.zip_file")}
                  />
                  <DownloadButton
                    icon="download"
                    href={`/api/elections/${election.id}/committee_sessions/${committeeSession.id}/download_zip_attachment_csb`}
                    title={t("election_management.CSB.p_22_2_attachment.download")}
                    subtitle={t("election_management.zip_file")}
                  />
                  <DownloadButton
                    icon="download"
                    href={`/api/elections/${election.id}/committee_sessions/${committeeSession.id}/download_zip_total_counts_csb`}
                    title={t(`election_management.CSB.download_definitive_documents`, {
                      sessionLabel: sessionLabel.toLowerCase(),
                    })}
                    subtitle={t("election_management.zip_file")}
                  />
                </>
              )}
            </div>
            <section className={cn(cls.reportInfoSection, "sm")}>
              <h3>{t("election_management.what_now")}?</h3>
              <p>{t(`election_management.${election.committee_category}.download_definitive_files`)}</p>
              <section className="sm">
                {election.committee_category === "GSB" ? (
                  <GSBElectionReportSection election={election} committeeSession={committeeSession} />
                ) : (
                  <CSBElectionReportSection election={election} />
                )}
                <p>{t(`election_management.${election.committee_category}.upload_the_zip`)}</p>
              </section>
            </section>

            <FormLayout.Controls>
              <Button.Link to="../..">{t("back_to_overview")}</Button.Link>
              {currentCommitteeSession.id === committeeSession.id && (
                <Button variant="secondary" onClick={handleResume}>
                  {t("election_report.resume_data_entry")}
                </Button>
              )}
            </FormLayout.Controls>
          </div>
          {showModal && <ResumeDataEntryModal onClose={closeModal} to={`../../status`} />}
        </article>
      </main>
      <Footer />
    </>
  );
}
