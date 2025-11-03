import { useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Loader } from "@/components/ui/Loader/Loader";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUsers } from "@/hooks/user/useUsers";
import { t, tx } from "@/i18n/translate";
import { ResolveErrorsAction } from "@/types/generated/openapi";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { usePollingStationDataEntryErrors } from "../hooks/usePollingStationDataEntryErrors";
import cls from "./ResolveErrors.module.css";
import { ResolveErrorsOverview } from "./ResolveErrorsOverview";

export function ResolveErrorsIndexPage() {
  const { pushMessage } = useMessages();
  const navigate = useNavigate();
  const pollingStationId = useNumericParam("pollingStationId");
  const { pollingStation, election, loading, dataEntry, action, setAction, onSubmit, validationError } =
    usePollingStationDataEntryErrors(pollingStationId);

  const afterSave = (action: ResolveErrorsAction) => {
    switch (action) {
      case "resume_first_entry":
        pushMessage({
          title: t("election_status.success.data_entry_resumed", {
            nr: pollingStation.number,
            typist: dataEntry?.user_id ? getName(dataEntry.user_id) : t("typist").toLowerCase(),
          }),
          text: t("election_status.success.typist_can_continue_data_entry"),
        });
        break;
      case "discard_first_entry":
        pushMessage({
          title: t("election_status.success.data_entry_discarded", { nr: pollingStation.number }),
          text: t("election_status.success.polling_station_can_be_filled_again"),
        });
        break;
    }
    void navigate(`/elections/${election.id}/status`);
  };

  const { getName } = useUsers();

  if (loading || dataEntry === null) {
    return <Loader />;
  }

  const structure = getDataEntryStructure(dataEntry.data.model, election);

  return (
    <>
      <h2>{t("resolve_errors.title")}</h2>
      <p className="md">{t("resolve_errors.page_content")}</p>

      <ResolveErrorsOverview structure={structure} results={dataEntry.validation_results} />

      <Form
        className={cls.resolveForm}
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(afterSave);
        }}
      >
        <FormLayout>
          <FormLayout.Section title={t("resolve_errors.form_question")}>
            <p>{t("resolve_errors.form_content")}</p>
            <ChoiceList>
              {validationError && <ChoiceList.Error id="resolve-errors-error">{validationError}</ChoiceList.Error>}
              <ChoiceList.Radio
                id="keep_entry"
                label={tx("resolve_errors.options.resume_first_entry", undefined, {
                  name: dataEntry.user_id ? getName(dataEntry.user_id) : t("typist").toLowerCase(),
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
          </FormLayout.Section>
          <FormLayout.Controls>
            <Button type="submit">{t("save")}</Button>
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    </>
  );
}
