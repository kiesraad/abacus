import { Link, Navigate, Outlet, useLocation } from "react-router";

import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { PageTitle } from "@/components/page_title/PageTitle";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { ProgressList } from "@/components/ui/ProgressList/ProgressList";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/lib/i18n";

import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";
import cls from "./ElectionCreateLayout.module.css";

interface ElectionCreateFormSection {
  key: string;
  label: string;
  path: string;
}

const formSections: ElectionCreateFormSection[] = [
  { key: "election_definition", label: t("election_definition"), path: "create" },
  { key: "polling_station_role", label: t("polling_station.role"), path: "create/polling-station-role" },
  { key: "list_of_candidates", label: t("candidate.list.plural"), path: "create/list-of-candidates" },
  { key: "polling_stations", label: t("polling_stations"), path: "create/polling-stations" },
  { key: "counting_method_type", label: t("counting_method_type"), path: "create/counting-method-type" },
  { key: "number_of_voters", label: t("polling_station.number_of_voters"), path: "create/number-of-voters" },
];

export function ElectionCreateLayout() {
  const { isAdministrator } = useUserRole();
  const location = useLocation();

  if (!isAdministrator) {
    return <Navigate to="/account/login" state={{ unauthorized: true }} />;
  }

  const currentFormSection = formSections.findIndex((formSection) => location.pathname.endsWith(formSection.path));

  return (
    <>
      <PageTitle title={`${t("election.create")} - Abacus`} />
      <NavBar location={location} />
      <header>
        <section>
          <h1>{t("election.create")}</h1>
        </section>
      </header>
      <main>
        <StickyNav>
          <ProgressList>
            <ProgressList.Fixed>
              {formSections.map((formSection, index) => (
                <ProgressList.Item
                  key={formSection.key}
                  status={index < currentFormSection ? "accept" : "idle"}
                  active={index === currentFormSection}
                  disabled={index > currentFormSection}
                >
                  {index >= currentFormSection ? (
                    <span>{formSection.label}</span>
                  ) : (
                    <Link to={`/elections/${formSection.path}`}>
                      <span>{formSection.label}</span>
                    </Link>
                  )}
                </ProgressList.Item>
              ))}
            </ProgressList.Fixed>
            <div className="mt-md">
              <ProgressList.Fixed>
                <ProgressList.Item
                  key="check_and_save"
                  status="idle"
                  disabled={currentFormSection !== formSections.length}
                  active={currentFormSection === formSections.length}
                >
                  <span>{t("check_and_save.title")}</span>
                </ProgressList.Item>
              </ProgressList.Fixed>
            </div>
          </ProgressList>
        </StickyNav>
        <article className={cls.container}>
          <ElectionCreateContextProvider>
            <Outlet />
          </ElectionCreateContextProvider>
        </article>
      </main>
      <Footer />
    </>
  );
}
