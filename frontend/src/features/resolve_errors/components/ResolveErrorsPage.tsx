import { useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { Badge } from "@/components/ui/Badge/Badge";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Loader } from "@/components/ui/Loader/Loader";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t, tx } from "@/i18n/translate";
import { ResolveErrorsAction } from "@/types/generated/openapi";

import { usePollingStationDataEntryErrors } from "../hooks/usePollingStationDataEntryErrors";
import cls from "./ResolveErrors.module.css";

export function ResolveErrorsPage() {
  const navigate = useNavigate();
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
  const pollingStationId = useNumericParam("pollingStationId");
  const { pollingStation, election, loading, dataEntry, userFullname, action, setAction, onSubmit, validationError } =
    usePollingStationDataEntryErrors(pollingStationId, afterSave);

  if (loading || dataEntry === null) {
    return <Loader />;
  }

  return (
    <>
      <PageTitle title={`${t("resolve_errors.page_title")} - Abacus`} />
      <header>
        <section className="smaller-gap">
          <PollingStationNumber>{pollingStation.number}</PollingStationNumber>
          <h1>{pollingStation.name}</h1>
          <Badge type="first_entry_has_errors" />
        </section>
      </header>
      <main className={cls.resolveErrors}>
        <aside></aside>
        <article>
          <h2>{t("resolve_errors.title")}</h2>
          <p>{t("resolve_errors.page_content")}</p>

          <pre>{JSON.stringify(dataEntry.validation_results, null, 2)}</pre>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
          >
            <h3 className="heading-lg mb-md">{t("resolve_errors.form_question")}</h3>
            <p>{t("resolve_errors.form_content")}</p>
            <ChoiceList>
              {validationError && <ChoiceList.Error id="resolve-errors-error">{validationError}</ChoiceList.Error>}
              <ChoiceList.Radio
                id="keep_entry"
                label={tx("resolve_errors.options.resume_first_entry", undefined, {
                  name: userFullname ?? t("typist"),
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
        </article>
      </main>
    </>
  );
}
