import { Navigate, Outlet, useLocation } from "react-router";

import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { PageTitle } from "@/components/page_title/PageTitle";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { ProgressList } from "@/components/ui/ProgressList/ProgressList";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/lib/i18n";

import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";

export function ElectionCreateLayout() {
  const { isAdministrator } = useUserRole();
  const location = useLocation();

  if (!isAdministrator) {
    return <Navigate to="/account/login" state={{ unauthorized: true }} />;
  }

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
              <ProgressList.Item key="election_definition" status="idle" active>
                <span>{t("election_definition")}</span>
              </ProgressList.Item>
              <ProgressList.Item key="polling_station_role" status="idle" disabled>
                <span>{t("polling_station.role")}</span>
              </ProgressList.Item>
              <ProgressList.Item key="list_of_candidates" status="idle" disabled>
                <span>{t("candidate.list.plural")}</span>
              </ProgressList.Item>
              <ProgressList.Item key="polling_stations" status="idle" disabled>
                <span>{t("polling_stations")}</span>
              </ProgressList.Item>
              <ProgressList.Item key="counting_method_type" status="idle" disabled>
                <span>{t("counting_method_type")}</span>
              </ProgressList.Item>
              <ProgressList.Item key="number_of_voters" status="idle" disabled>
                <span>{t("polling_station.number_of_voters")}</span>
              </ProgressList.Item>
            </ProgressList.Fixed>
            <div className="mt-md">
              <ProgressList.Fixed>
                <ProgressList.Item key="check_and_save" status="idle" disabled>
                  <span>{t("check_and_save.title")}</span>
                </ProgressList.Item>
              </ProgressList.Fixed>
            </div>
          </ProgressList>
        </StickyNav>
        <article>
          <ElectionCreateContextProvider>
            <Outlet />
          </ElectionCreateContextProvider>
        </article>
      </main>
      <Footer />
    </>
  );
}
