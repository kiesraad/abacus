import { Navigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { t } from "@/i18n/translate";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function CheckAndSave() {
  const { state } = useElectionCreateContext();

  if (!state.election) {
    return <Navigate to="/elections/create" />;
  }

  return (
    <section className="md">
      <h2>{t("election.check_and_save.title")}</h2>
      <p className="mt-lg">{t("election.check_and_save.description")}</p>
      <ul>
        <li>
          <strong>{t("election.singular")}:</strong> {state.election.name}
        </li>
        <li>
          <strong>{t("area_designation")}:</strong> {state.election.location}
        </li>
      </ul>
      <div className="mt-xl">
        <Button>{t("save")}</Button>
      </div>
    </section>
  );
}
