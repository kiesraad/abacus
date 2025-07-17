import { useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUsers } from "@/hooks/user/useUsers";
import { t, tx } from "@/i18n/translate";
import { ResolveErrorsAction } from "@/types/generated/openapi";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { usePollingStationDataEntryErrors } from "../hooks/usePollingStationDataEntryErrors";
import cls from "./ResolveErrors.module.css";
import { ResolveErrorsOverview } from "./ResolveErrorsOverview";

export function ResolveErrorsIndexPage() {
  const navigate = useNavigate();
  const pollingStationId = useNumericParam("pollingStationId");
  const { pollingStation, election, loading, dataEntry, action, setAction, onSubmit, validationError } =
    usePollingStationDataEntryErrors(pollingStationId);

  const afterSave = (action: ResolveErrorsAction) => {
    let url = `/elections/${election.id}/status`;
    switch (action) {
      case "resume_first_entry":
        url += `#data-entry-resumed-${pollingStation.id}`;
        break;
      case "discard_first_entry":
        url += `#data-entry-discarded-${pollingStation.id}`;
        break;
    }
    void navigate(url);
  };
  const { committeeSession } = useElection();
  const { getName } = useUsers();

  // Safeguard so users cannot circumvent the check via the browser's address bar
  if (committeeSession.status !== "data_entry_in_progress") {
    throw new Error(t("error.api_error.CommitteeSessionNotInProgress"));
  }

  if (loading || dataEntry === null) {
    return <Loader />;
  }

  const structure = getDataEntryStructure(election, dataEntry.finalised_first_entry);

  return (
    <>
      <h2>{t("resolve_errors.title")}</h2>
      <p>{t("resolve_errors.page_content")}</p>

      <ResolveErrorsOverview structure={structure} results={dataEntry.validation_results} />

      <form
        className={cls.resolveForm}
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(afterSave);
        }}
      >
        <h3 className="heading-lg mb-md">{t("resolve_errors.form_question")}</h3>
        <p>{t("resolve_errors.form_content")}</p>
        <ChoiceList>
          {validationError && <ChoiceList.Error id="resolve-errors-error">{validationError}</ChoiceList.Error>}
          <ChoiceList.Radio
            id="keep_entry"
            label={tx("resolve_errors.options.resume_first_entry", undefined, {
              name: getName(dataEntry.first_entry_user_id, t("typist")),
            })}
            checked={action === "resume_first_entry"}
            onChange={() => {
              setAction("resume_first_entry");
            }}
          >
            {t("resolve_errors.options.resume_first_entry_description")}
          </ChoiceList.Radio>
          <ChoiceList.Radio
            id="discard_entry"
            label={tx("resolve_errors.options.discard_first_entry")}
            checked={action === "discard_first_entry"}
            onChange={() => {
              setAction("discard_first_entry");
            }}
          >
            {t("resolve_errors.options.discard_first_entry_description")}
          </ChoiceList.Radio>
        </ChoiceList>
        <Button size="xl" type="submit">
          {t("save")}
        </Button>
      </form>
    </>
  );
}
