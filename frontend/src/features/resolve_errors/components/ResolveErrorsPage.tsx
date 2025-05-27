import { useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { Badge } from "@/components/ui/Badge/Badge";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Loader } from "@/components/ui/Loader/Loader";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t, tx } from "@/i18n/translate";

import cls from "./ResolveErrors.module.css";

export function ResolveErrorsPage() {
  const navigate = useNavigate();
  const afterSave = () => {
    void navigate(`/elections/${election.id}/status`);
  };
  const pollingStationId = useNumericParam("pollingStationId");
  // TODO: Add hook
  const { pollingStation, election, loading, status, action, setAction, onSubmit, validationError } =
    usePollingStationDataEntryErrors(pollingStationId, afterSave);

  if (loading || status === null) {
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
                label={tx("resolve_errors.options.keep_entry", undefined, { name: status.first_user })}
                checked={action === "keep_entry"}
                onChange={() => {
                  setAction("keep_entry");
                }}
              >
                {t("resolve_errors.options.keep_entry_description")}
              </ChoiceList.Radio>
              <ChoiceList.Radio
                id="discard_entry"
                label={tx("resolve_errors.options.discard_entry")}
                checked={action === "discard_entry"}
                onChange={() => {
                  setAction("discard_entry");
                }}
              >
                {t("resolve_errors.options.discard_entry_description")}
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
