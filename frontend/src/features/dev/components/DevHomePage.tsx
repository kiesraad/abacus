import { useState } from "react";
import { Link } from "react-router";

import { ApiResult, isError } from "@/api/ApiResult";
import { useApiState } from "@/api/useApiState";
import { useInitialApiGet } from "@/api/useInitialApiGet";
import { PageTitle } from "@/components/page_title/PageTitle";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
import { Button } from "@/components/ui/Button/Button";
import { Loader } from "@/components/ui/Loader/Loader";
import { Modal } from "@/components/ui/Modal/Modal";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import {
  CommitteeSession,
  ELECTION_LIST_REQUEST_PATH,
  Election,
  ElectionListResponse,
  LoginResponse,
} from "@/types/generated/openapi";

import { GenerateTestElectionForm } from "./GenerateTestElectionForm";
import { MockTest } from "./MockTest";

function Links() {
  const { isTypist, isAdministrator, isCoordinator } = useUserRole();
  const { requestState: getElections } = useInitialApiGet<ElectionListResponse>(
    `/api/elections` satisfies ELECTION_LIST_REQUEST_PATH,
  );

  if (getElections.status === "loading") {
    return <Loader />;
  }

  if (getElections.status !== "success") {
    throw getElections.error;
  }

  const electionList = getElections.data.elections;
  const committeeSessions = getElections.data.committee_sessions;

  return (
    <>
      {(__API_MSW__ || isAdministrator || isCoordinator) && (
        <AdministratorCoordinatorLinks electionList={electionList} committeeSessions={committeeSessions} />
      )}
      {(__API_MSW__ || isTypist) && <TypistLinks electionList={electionList} committeeSessions={committeeSessions} />}
    </>
  );
}

interface LinksProps {
  electionList: Election[];
  committeeSessions: CommitteeSession[];
}

function TypistLinks({ electionList }: LinksProps) {
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

function AdministratorCoordinatorLinks({ electionList, committeeSessions }: LinksProps) {
  const { isAdministrator } = useUserRole();

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
          {electionList.map((election) => {
            const committeeSession = committeeSessions.find((cs) => cs.election_id === election.id);

            return (
              <li key={election.id}>
                <Link to={`/elections/${election.id}`}>{election.name}</Link>
                <ul>
                  <li>
                    <Link to={`/elections/${election.id}/status`}>{t("election_status.main_title")}</Link>
                  </li>
                  <li>
                    <Link to={`/elections/${election.id}/polling-stations`}>{t("polling_station.title.plural")}</Link>
                  </li>
                  {committeeSession && committeeSession.number > 1 && (
                    <li>
                      <Link to={`/elections/${election.id}/investigations`}>{t("investigations.title")}</Link>
                    </li>
                  )}
                </ul>
              </li>
            );
          })}
        </ul>
        <li>
          <Link to={`/users`}>{t("users.manage")}</Link>
        </li>
        <li>
          <Link to={`/logs`}>{t("activity_log")}</Link>
        </li>
      </ul>
    </>
  );
}

function DevLinks() {
  const { user, login, logout } = useApiState();
  const [response, setResponse] = useState<ApiResult<LoginResponse> | null>(null);
  const [showGenerateElectionModal, setShowGenerateElectionModal] = useState(false);

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
            <a href="/storybook/" target="_blank" rel="noopener noreferrer">
              Storybook
            </a>
          </li>
        )}
        <li>
          <Button
            type="button"
            variant="underlined"
            size="md"
            onClick={() => {
              setShowGenerateElectionModal(true);
            }}
          >
            Genereer testverkiezing
          </Button>
        </li>
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
      {(__API_MSW__ || user) && <Links />}
      {!__API_MSW__ && showGenerateElectionModal && (
        <Modal
          title="Genereer testverkiezing"
          onClose={() => {
            setShowGenerateElectionModal(false);
          }}
          noFlex
          autoWidth
        >
          <GenerateTestElectionForm />
        </Modal>
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
