import { useCallback, useEffect, useState } from "react";
import { Link, Outlet, useBlocker, useLocation, useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { Loader } from "@/components/ui/Loader/Loader";
import { ProgressList } from "@/components/ui/ProgressList/ProgressList";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { MenuStatus } from "@/types/ui";

import { StartDataEntryModal } from "./StartDataEntryModal";

const formSections = [
  { key: "reason_and_assigment", label: t("investigations.reason_and_assignment.title"), path: "reason" },
  { key: "print_corrigendum", label: t("investigations.print_corrigendum.nav_title"), path: "print-corrigendum" },
  { key: "investigation_findings", label: t("investigations.findings.nav_title"), path: "findings" },
];

export function AddInvestigationLayout() {
  const location = useLocation();
  const pollingStationId = useNumericParam("pollingStationId");
  const { currentCommitteeSession, election, pollingStation, investigation } = useElection(pollingStationId);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const currentFormSection = formSections.findIndex((formSection) => location.pathname.endsWith(formSection.path));

  const shouldShowModal = useCallback(
    (path: string) => {
      const section = path.split("/").pop();
      return section === "findings" && currentCommitteeSession.status === "data_entry_not_started";
    },
    [currentCommitteeSession.status],
  );

  const closeModal = () => {
    setShowModal(false);

    // If the user closes the modal while on the findings page, navigate to the corrigendum page
    if (shouldShowModal(location.pathname)) {
      void navigate(`../${pollingStationId}/print-corrigendum`);
    }
  };

  // Check route on load
  useEffect(() => {
    setShowModal(shouldShowModal(location.pathname));
  }, [location.pathname, shouldShowModal]);

  // Check route on navigation
  useBlocker(({ nextLocation }) => {
    if (!showModal && shouldShowModal(nextLocation.pathname)) {
      setShowModal(true);
      return true;
    } else {
      setShowModal(false);
    }

    return false;
  });

  if (!pollingStation) {
    return <Loader />;
  }

  return (
    <>
      <PageTitle
        title={`${t("investigations.add_investigation")} ${pollingStation.number} ${pollingStation.name} - Abacus`}
      />
      <header>
        <section className="smaller-gap">
          <PollingStationNumber>{pollingStation.number}</PollingStationNumber>
          <h1>{pollingStation.name}</h1>
        </section>
      </header>
      {currentCommitteeSession.status === "data_entry_finished" && (
        <Alert type="warning">
          <strong className="heading-md">{t("investigations.warning_data_entry_finished.title")}</strong>
          <p>{t("investigations.warning_data_entry_finished.description")}</p>
        </Alert>
      )}
      <main>
        <StickyNav>
          <ProgressList>
            {formSections.map((formSection, index) => {
              const disabled = index > currentFormSection && investigation === undefined;
              let status: MenuStatus = currentFormSection === index ? "active" : "idle";

              if (investigation?.reason && formSection.key === "reason_and_assigment") {
                status = "accept";
              }

              if (investigation?.reason && formSection.key === "print_corrigendum" && index < currentFormSection) {
                status = "accept";
              }

              if (investigation?.findings) {
                status = "accept";
              }

              return (
                <div key={formSection.key}>
                  <ProgressList.Fixed>
                    <ProgressList.Item
                      key={formSection.key}
                      status={status}
                      disabled={disabled}
                      active={currentFormSection === index}
                    >
                      {disabled ? (
                        <span>{formSection.label}</span>
                      ) : (
                        <Link to={`/elections/${election.id}/investigations/${pollingStation.id}/${formSection.path}`}>
                          <span>{formSection.label}</span>
                        </Link>
                      )}
                    </ProgressList.Item>
                  </ProgressList.Fixed>
                </div>
              );
            })}
          </ProgressList>
        </StickyNav>
        <article className="md">
          <Outlet />
          {showModal && <StartDataEntryModal onClose={closeModal} to={`./findings`} />}
        </article>
      </main>
    </>
  );
}
