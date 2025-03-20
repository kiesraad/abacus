import { Link } from "react-router";

import { MockTest } from "@/components/MockTest";

import { ElectionListProvider, useApiState, useElectionList, useUserRole } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { AppLayout, PageTitle } from "@kiesraad/ui";

function TypistLinks() {
  const { electionList } = useElectionList();

  return (
    <>
      <strong>{t("typist")}</strong>
      <ul>
        <li>
          <Link to={"/elections"}>{t("election.title.plural")}</Link>
        </li>
        <ul>
          {electionList.map((election) => (
            <li key={election.id}>
              <Link to={`/elections/${election.id}/data-entry`}>{election.name}</Link>
            </li>
          ))}
        </ul>
      </ul>
    </>
  );
}

function AdministratorCoordinatorLinks() {
  const { electionList } = useElectionList();
  const { isAdministrator } = useUserRole();

  return (
    <>
      <strong>
        {t("administrator")} / {t("coordinator")}
      </strong>
      <ul>
        <li>
          <Link to={"/elections"}>{t("election.manage")}</Link>
        </li>
        <ul>
          {electionList.map((election) => (
            <li key={election.id}>
              <Link to={`/elections/${election.id}`}>{election.name}</Link>
              <ul>
                <li>
                  <Link to={`/elections/${election.id}/status`}>{t("election_status.main_title")}</Link>
                </li>
                <li>
                  <Link to={`/elections/${election.id}/apportionment`}>{t("apportionment.title")}</Link>
                </li>
                <li>
                  <Link to={`/elections/${election.id}/polling-stations`}>{t("polling_station.title.plural")}</Link>
                </li>
              </ul>
            </li>
          ))}
        </ul>
        {isAdministrator && (
          <>
            <li>
              <Link to={`/users`}>{t("users.management")}</Link>
            </li>
            <li>
              <Link to={`/workstations`}>{t("workstations.manage")}</Link>
            </li>
          </>
        )}
        <li>
          <Link to={`/logs`}>{t("activity_log")}</Link>
        </li>
      </ul>
    </>
  );
}

function DevLinks() {
  const { user, login, logout } = useApiState();
  const { isTypist, isAdministrator, isCoordinator } = useUserRole();

  return (
    <>
      <p>Dit is een ontwikkelversie van Abacus. Kies hieronder welk deel van de applicatie je wilt gebruiken.</p>
      <strong>Inloggen als</strong>
      <ul>
        <li>
          <Link
            to="/dev"
            onClick={() => {
              void login("admin", "AdminPassword01");
            }}
          >
            {t("administrator")}
          </Link>
        </li>
        <li>
          <Link
            to="/dev"
            onClick={() => {
              void login("coordinator", "CoordinatorPassword01");
            }}
          >
            {t("coordinator")}
          </Link>
        </li>
        <li>
          <Link
            to="/dev"
            onClick={() => {
              void login("typist", "TypistPassword01");
            }}
          >
            {t("typist")}
          </Link>
        </li>
        {user && (
          <li>
            <Link
              to="/dev"
              onClick={() => {
                void logout();
              }}
            >
              {t("account.logout")}: {user.fullname || user.username} ({user.role})
            </Link>
          </li>
        )}
      </ul>
      <strong>{t("general")}</strong>
      <ul>
        <li>
          <Link to={`/account`}>{t("account.account")}</Link>
          <ul>
            <li>
              <Link to={`/account/login`}>{t("account.login")}</Link>
            </li>
            <li>
              <Link to={`/account/setup`}>{t("account.account_setup")}</Link>
            </li>
          </ul>
        </li>
      </ul>
      {isTypist && (
        <ElectionListProvider>
          <TypistLinks />
        </ElectionListProvider>
      )}
      {(isAdministrator || isCoordinator) && (
        <ElectionListProvider>
          <AdministratorCoordinatorLinks />
        </ElectionListProvider>
      )}
    </>
  );
}

export function DevHomePage() {
  return (
    <AppLayout>
      <PageTitle title="Dev Homepage - Abacus" />
      <header>
        <section>
          <h1>Abacus 🧮</h1>
        </section>
      </header>
      <main>
        <article>
          <DevLinks />
          {__API_MSW__ && <MockTest />}
        </article>
      </main>
    </AppLayout>
  );
}
