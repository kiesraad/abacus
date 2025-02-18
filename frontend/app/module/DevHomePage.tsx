import { Link } from "react-router";

import { MockTest } from "app/component/MockTest";

import { ElectionListProvider, useApiState, useElectionList } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { AppLayout, PageTitle } from "@kiesraad/ui";

function DevLinks() {
  const { electionList } = useElectionList();
  const { user, login, logout } = useApiState();

  return (
    <>
      <p>Dit is een ontwikkelversie van Abacus. Kies hieronder welk deel van de applicatie je wilt gebruiken.</p>
      <strong>Inloggen als</strong>
      <ul>
        <li>
          <Link
            to="/dev"
            onClick={() => {
              void login("admin", "password");
            }}
          >
            {t("administrator")}
          </Link>
        </li>
        <li>
          <Link
            to="/dev"
            onClick={() => {
              void login("typist", "password");
            }}
          >
            {t("typist")}
          </Link>
        </li>
        <li>
          <Link
            to="/dev"
            onClick={() => {
              void login("coordinator", "password");
            }}
          >
            {t("coordinator")}
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
              {t("user.logout")}: {user.fullname} ({user.role})
            </Link>
          </li>
        )}
      </ul>
      <strong>{t("general")}</strong>
      <ul>
        <li>
          <Link to={`/account`}>{t("user.account")}</Link>
          <ul>
            <li>
              <Link to={`/account/login`}>{t("user.login")}</Link>
            </li>
            <li>
              <Link to={`/account/setup`}>{t("user.account_setup")}</Link>
            </li>
            <li>
              <Link to={`/account/change-password`}>{t("user.change_password")}</Link>
            </li>
          </ul>
        </li>
      </ul>
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
                  <Link to={`/elections/${election.id}/apportionment`}>{t("apportionment.title")}</Link>
                </li>
                <li>
                  <Link to={`/elections/${election.id}/status`}>{t("election_status.main_title")}</Link>
                </li>
                <li>
                  <Link to={`/elections/${election.id}/polling-stations`}>{t("polling_station.title.plural")}</Link>
                </li>
              </ul>
            </li>
          ))}
        </ul>
        <li>
          <Link to={`/users`}>{t("users.management")}</Link>
        </li>
        <li>
          <Link to={`/workstations`}>{t("workstations.manage")}</Link>
        </li>
        <li>
          <Link to={`/logs`}>{t("activity_log")}</Link>
        </li>
      </ul>
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
          <ElectionListProvider>
            <DevLinks />
          </ElectionListProvider>
          {__API_MSW__ && <MockTest />}
        </article>
      </main>
    </AppLayout>
  );
}
