import { t } from "@/i18n/translate";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function ElectionHeader() {
  const { state } = useElectionCreateContext();

  return (
    <header>
      <section>
        <h1>{state.election ? t("election.add", { name: state.election.name }) : t("election.create")}</h1>
      </section>
    </header>
  );
}
