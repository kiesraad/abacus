import { useState } from "react";
import { Link } from "react-router";

import { ApiResult, isError } from "@/api/ApiResult";
import { useApiState } from "@/api/useApiState";
import { MockTest } from "@/components/dev/MockTest";
import { PageTitle } from "@/components/page_title/PageTitle";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
import { ElectionListProvider } from "@/hooks/election/ElectionListProvider";
import { useElectionList } from "@/hooks/election/useElectionList";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import { LoginResponse } from "@/types/generated/openapi";

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
  const { isAdministrator, isCoordinator } = useUserRole();

  return (
    <>
      <strong>
        {t("administrator")} / {t("coordinator")}
      </strong>
      <ul>
        <li>
          <Link to={"/elections"}>{isAdministrator ? t("election.manage") : t("election.title.plural")}</Link>
        </li>
        <ul>
          {electionList.map((election) => (
            <li key={election.id}>
              <Link to={`/elections/${election.id}`}>{election.name}</Link>
              <ul>
                <li>
                  <Link to={`/elections/${election.id}/status`}>{t("election_status.main_title")}</Link>
                </li>
                {isCoordinator && (
                  <li>
                    <Link to={`/elections/${election.id}/apportionment`}>{t("apportionment.title")}</Link>
                  </li>
                )}
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
              <Link to={`/users`}>{t("users.manage")}</Link>
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
  const [response, setResponse] = useState<ApiResult<LoginResponse> | null>(null);

  if (response !== null && isError(response)) {
    throw response;
  }

  return (
    <>
      <p>Dit is een ontwikkelversie van Abacus. Kies hieronder welk deel van de applicatie je wilt gebruiken.</p>
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
        {__INCLUDE_STORYBOOK_LINK__ && (
          <li>
            <a href="/storybook" target="_blank" rel="noopener noreferrer">
              Storybook
            </a>
          </li>
        )}
      </ul>
      {!__API_MSW__ && (
        <>
          <strong>Inloggen als</strong>
          <ul>
            <li>
              <Link
                to="/dev"
                onClick={() => {
                  void login("admin1", "Admin1Password01").then(setResponse);
                }}
              >
                {t("administrator")} 1
              </Link>
            </li>
            <li>
              <Link
                to="/dev"
                onClick={() => {
                  void login("admin2", "Admin2Password01").then(setResponse);
                }}
              >
                {t("administrator")} 2
              </Link>
            </li>
            <li>
              <Link
                to="/dev"
                onClick={() => {
                  void login("coordinator1", "Coordinator1Password01").then(setResponse);
                }}
              >
                {t("coordinator")} 1
              </Link>
            </li>
            <li>
              <Link
                to="/dev"
                onClick={() => {
                  void login("coordinator2", "Coordinator2Password01").then(setResponse);
                }}
              >
                {t("coordinator")} 2
              </Link>
            </li>
            <li>
              <Link
                to="/dev"
                onClick={() => {
                  void login("typist1", "Typist1Password01").then(setResponse);
                }}
              >
                {t("typist")} 1
              </Link>
            </li>
            <li>
              <Link
                to="/dev"
                onClick={() => {
                  void login("typist2", "Typist2Password01").then(setResponse);
                }}
              >
                {t("typist")} 2
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
        </>
      )}
      {(__API_MSW__ || isAdministrator || isCoordinator) && (
        <ElectionListProvider>
          <AdministratorCoordinatorLinks />
        </ElectionListProvider>
      )}
      {(__API_MSW__ || isTypist) && (
        <ElectionListProvider>
          <TypistLinks />
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
