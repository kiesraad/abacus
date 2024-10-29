import { Link, useNavigate } from "react-router-dom";

import { ElectionStatusProgress } from "app/component/election/ElectionStatusProgress";
import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

import { useElection, useElectionStatus } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, Button, PageTitle } from "@kiesraad/ui";

export function ElectionStatusPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { statuses } = useElectionStatus();

  function finishInput() {
    navigate("../report#coordinator");
  }

  return (
    <>
      <PageTitle title={t("election_status.title")} />
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
      </header>
      {statuses.length > 0 && statuses.every((s) => s.status === "definitive") && (
        <Alert type="success">
          <h2>{t("election_status.difinitive.title")}</h2>
          <p>{t("election_status.difititive.message")}</p>
          <Button onClick={finishInput} size="md">
            {t("election_status.difititive.finish_button")}
          </Button>
        </Alert>
      )}
      <main>
        <ElectionStatusProgress />
        <article>Placeholder</article>
      </main>
      <Footer />
    </>
  );
}
