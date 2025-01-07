import { Link, useNavigate } from "react-router";

import { HeaderElectionStatusWithIcon } from "app/component/election/ElectionStatusWithIcon";
import { ElectionStatus } from "app/component/election/status/ElectionStatus";
import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, Button, PageTitle } from "@kiesraad/ui";

export function ElectionStatusPage() {
  const navigate = useNavigate();
  const { election, pollingStations } = useElection();
  const { statuses } = useElectionStatus();

  function finishInput() {
    void navigate("../report#coordinator");
  }

  return (
    <>
      <PageTitle title={`${t("election_status.title")} - Abacus`} />
      <NavBar>
        <Link to={`/elections/${election.id}#coordinator`}>
          <span className="bold">{election.location}</span>
          <span>&mdash;</span>
          <span>{election.name}</span>
        </Link>
      </NavBar>
      <header>
        <section>
          <h1>{t("election_status.first_session")}</h1>
        </section>
        <section>
          <div className="election_status">
            <HeaderElectionStatusWithIcon status={election.status} userRole="coordinator" />
          </div>
        </section>
      </header>
      {election.status !== "DataEntryFinished" &&
        statuses.length > 0 &&
        statuses.every((s) => s.status === "definitive") && (
          <Alert type="success">
            <h2>{t("election_status.definitive.title")}</h2>
            <p>{t("election_status.definitive.message")}</p>
            <Button onClick={finishInput} size="md">
              {t("election_status.definitive.finish_button")}
            </Button>
          </Alert>
        )}
      <main>
        <ElectionStatus
          election={election}
          pollingStations={pollingStations}
          statuses={statuses}
          navigate={(path) => void navigate(path)}
        />
      </main>
      <Footer />
    </>
  );
}
