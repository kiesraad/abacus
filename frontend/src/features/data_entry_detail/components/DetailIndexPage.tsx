import { Navigate, useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Loader } from "@/components/ui/Loader/Loader";
import { showIndexPage } from "@/features/data_entry_detail/utils/validationResults";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUsers } from "@/hooks/user/useUsers";
import { t, tx } from "@/i18n/translate";
import type { ResolveErrorsAction } from "@/types/generated/openapi";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { usePollingStationDataEntryErrors } from "../hooks/usePollingStationDataEntryErrors";
import cls from "./detail.module.css";
import { ErrorsAndWarningsOverview } from "./ErrorsAndWarningsOverview";

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function DetailIndexPage() {
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
            typist: getName(dataEntry?.user_id),
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

  if (!showIndexPage(dataEntry.validation_results)) {
    // If we should not show this index page, redirect to the first section
    const firstSectionId = structure[0]?.id;
    if (firstSectionId === undefined) {
      throw new Error("Could not determine first section id");
    }
    return <Navigate to={`/elections/${election.id}/status/${pollingStationId}/detail/${firstSectionId}`} replace />;
  } else {
    const resolveErrors = dataEntry.status === "first_entry_has_errors";
    const translationPrefix = resolveErrors ? "data_entry_detail.resolve_errors" : "data_entry_detail.read_only";

    return (
      <>
        <h2>{t(`${translationPrefix}.title`)}</h2>
        <p className="md">{t(`${translationPrefix}.page_content`)}</p>

        <ErrorsAndWarningsOverview structure={structure} results={dataEntry.validation_results} />

        {resolveErrors && (
          // Coordinator needs to resolve the errors using the resolve errors form.
          <Form
            className={cls.resolveErrorsForm}
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit(afterSave);
            }}
          >
            <FormLayout>
              <FormLayout.Section title={t("data_entry_detail.resolve_errors.form_question")}>
                <p>{t("data_entry_detail.resolve_errors.form_content")}</p>
                <ChoiceList>
                  {validationError && <ChoiceList.Error id="resolve-errors-error">{validationError}</ChoiceList.Error>}
                  <ChoiceList.Radio
                    id="keep_entry"
                    label={tx("data_entry_detail.resolve_errors.options.resume_first_entry", undefined, {
                      name: getName(dataEntry.user_id),
                    })}
                    checked={action === "resume_first_entry"}
                    onChange={() => {
                      setAction("resume_first_entry");
                    }}
                  >
                    {t("data_entry_detail.resolve_errors.options.resume_first_entry_description")}
                  </ChoiceList.Radio>
                  <ChoiceList.Radio
                    id="discard_entry"
                    label={tx("data_entry_detail.resolve_errors.options.discard_first_entry")}
                    checked={action === "discard_first_entry"}
                    onChange={() => {
                      setAction("discard_first_entry");
                    }}
                  >
                    {t("data_entry_detail.resolve_errors.options.discard_first_entry_description")}
                  </ChoiceList.Radio>
                </ChoiceList>
              </FormLayout.Section>
              <FormLayout.Controls>
                <Button type="submit">{t("save")}</Button>
              </FormLayout.Controls>
            </FormLayout>
          </Form>
        )}
      </>
    );
  }
}
