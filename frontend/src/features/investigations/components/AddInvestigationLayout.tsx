import { Link, Outlet, useLocation } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { Loader } from "@/components/ui/Loader/Loader";
import { ProgressList } from "@/components/ui/ProgressList/ProgressList";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { MenuStatus } from "@/types/ui";

const formSections = [
  { key: "reason_and_assigment", label: t("investigations.reason_and_assignment.title"), path: "reason" },
  { key: "print_corrigendum", label: t("investigations.print_corrigendum.nav_title"), path: "print-corrigendum" },
  { key: "investigation_findings", label: t("investigations.findings.nav_title"), path: "findings" },
];

export function AddInvestigationLayout() {
  const location = useLocation();
  const pollingStationId = useNumericParam("pollingStationId");
  const { election, pollingStation, investigation } = useElection(pollingStationId);

  const currentFormSection = formSections.findIndex((formSection) => location.pathname.endsWith(formSection.path));

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
      <main>
        <StickyNav>
          <ProgressList>
            {formSections.map((formSection, index) => {
              const disabled = index > currentFormSection && investigation === undefined;
              let status: MenuStatus = currentFormSection === index ? "active" : "idle";

              if (investigation?.reason && formSection.key === "reason_and_assigment") {
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
        </article>
      </main>
    </>
  );
}
