import { useState } from "react";
import { Navigate } from "react-router";

import { ApplicationError, NotFoundError } from "@/api/ApiResult";
import { Footer } from "@/components/footer/Footer";
import { IconCheckVerified } from "@/components/generated/icons";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Icon } from "@/components/ui/Icon/Icon";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { committeeSessionLabel } from "@/utils/committeeSession";

import cls from "../ElectionManagement.module.css";
import { CSBElectionReportSection } from "./CSBElectionReportSection";
import { GSBElectionReportSection } from "./GSBElectionReportSection";
import { ResumeDataEntryModal } from "./ResumeDataEntryModal";

export function ElectionReportPage() {
  const { currentCommitteeSession, committeeSessions, election } = useElection();
  const committeeSessionId = useNumericParam("committeeSessionId");
  const [showModal, setShowModal] = useState(false);

  const committeeSession = committeeSessions.find((session) => session.id === committeeSessionId);
  if (!committeeSession) {
    throw new NotFoundError("error.not_found");
  }

  // Redirect to update details page if committee session details have not been filled in
  if (committeeSession.location === "" || !committeeSession.start_date_time) {
    return <Navigate to={`/elections/${election.id}/details#redirect-to-report`} />;
  }

  // Safeguard so users cannot circumvent the check via the browser's address bar
  if (committeeSession.status !== "completed") {
    throw new ApplicationError(t("error.forbidden_message"), "InvalidCommitteeSessionStatus");
  }

  const sessionLabel = committeeSessionLabel(election.committee_category, committeeSession.number);
  const categoryLabel = t(`committee_category.${election.committee_category}.short`).replace(/(^\w|\s\w)/g, (m) =>
    m.toLowerCase(),
  );
  const pageTitle =
    election.committee_category === "CSB"
      ? `${t("election_report.report")} ${categoryLabel}`
      : `${sessionLabel} ${categoryLabel}`;
  const ReportSection = election.committee_category === "GSB" ? GSBElectionReportSection : CSBElectionReportSection;

  return (
    <>
      <PageTitle title={`${pageTitle} - Abacus`} />
      <header>
        <section>
          <h1>{pageTitle}</h1>
        </section>
      </header>
      <main className={cls.reportMain}>
        <article>
          <div>
            <Icon size="lg" color="default" icon={<IconCheckVerified />} />
          </div>
          <div>
            <ReportSection election={election} committeeSession={committeeSession} sessionLabel={sessionLabel} />
            <FormLayout.Controls>
              <Button.Link to="../..">{t("back_to_overview")}</Button.Link>
              {currentCommitteeSession.id === committeeSession.id && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowModal(true);
                  }}
                >
                  {t("election_report.resume_data_entry")}
                </Button>
              )}
            </FormLayout.Controls>
          </div>
          {showModal && (
            <ResumeDataEntryModal
              onClose={() => {
                setShowModal(false);
              }}
              to={`../../status`}
            />
          )}
        </article>
      </main>
      <Footer />
    </>
  );
}
