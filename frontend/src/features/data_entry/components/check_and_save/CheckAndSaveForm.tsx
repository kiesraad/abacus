import * as React from "react";
import { Link, useNavigate } from "react-router";

import { ApiError } from "@/api/ApiResult";
import { useElection } from "@/api/election/useElection";
import { ErrorModal } from "@/components/error";
import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { KeyboardKeys } from "@/components/ui/KeyboardKeys/KeyboardKeys";
import { StatusList } from "@/components/ui/StatusList/StatusList";
import { t, tx } from "@/lib/i18n";
import { FormSectionId } from "@/types/types";
import { KeyboardKey, MenuStatus } from "@/types/ui";

import { useDataEntryContext } from "../../hooks/useDataEntryContext";
import { useFormKeyboardNavigation } from "../../hooks/useFormKeyboardNavigation";
import { SubmitCurrentFormOptions } from "../../types/types";
import { DataEntryFormSectionStatus, getDataEntrySummary } from "../../utils/dataEntryUtils";
import { getUrlForFormSectionID } from "../../utils/utils";
import { DataEntryNavigation } from "../DataEntryNavigation";

export function CheckAndSaveForm() {
  const formRef = useFormKeyboardNavigation();

  const navigate = useNavigate();
  const { election } = useElection();
  const { error, formState, onSubmitForm, status, onFinaliseDataEntry, pollingStationId, entryNumber } =
    useDataEntryContext("save");

  const getUrlForFormSection = React.useCallback(
    (id: FormSectionId) => {
      return getUrlForFormSectionID(election.id, pollingStationId, entryNumber, id);
    },
    [election, pollingStationId, entryNumber],
  );

  const summary = React.useMemo(() => {
    return getDataEntrySummary(formState);
  }, [formState]);

  const finalisationAllowed = Object.values(formState.sections).every(
    (section) => section.errors.isEmpty() && (section.warnings.isEmpty() || section.acceptWarnings),
  );

  // save the current state, without finalising (for the abort dialog)
  const onSubmit = async (options?: SubmitCurrentFormOptions) => {
    return await onSubmitForm({}, options);
  };

  // finalise the data entry and navigate away
  const onFinalise = async () => {
    if (!finalisationAllowed) {
      return false;
    }

    if (await onFinaliseDataEntry()) {
      await navigate(`/elections/${election.id}/data-entry#data-entry-saved-${entryNumber}`);
      return true;
    }

    return false;
  };

  return (
    <Form
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onFinalise();
      }}
      id="check_save_form"
      title={t("check_and_save.title")}
      ref={formRef}
    >
      <DataEntryNavigation onSubmit={onSubmit} />
      {error instanceof ApiError && <ErrorModal error={error} />}
      <section className="md" id="save-form-summary-text">
        {!summary.hasBlocks && summary.countsAddUp && (
          <p className="md">{t("check_and_save.counts_add_up.no_warnings")}</p>
        )}
        {summary.hasBlocks && summary.countsAddUp && (
          <>
            <p className="md">{t("check_and_save.counts_add_up.warnings")}</p>
            <p className="md">{t("check_and_save.check_warnings")}</p>
          </>
        )}
        {summary.hasBlocks && !summary.countsAddUp && (
          <>
            <p className="md">{t("check_and_save.counts_do_not_add_up")}</p>
            <p className="md">{t("check_and_save.fix_the_errors")}</p>
          </>
        )}
      </section>

      <StatusList id="save-form-summary-list">
        {summary.countsAddUp && (
          <StatusList.Item status="accept">{t("check_and_save.counts_add_up_title")}</StatusList.Item>
        )}

        {summary.notableFormSections.map((section) => {
          const link = (title: React.ReactElement) => (
            <Link to={getUrlForFormSection(section.formSection.id)}>{title}</Link>
          );
          const content = tx(
            `check_and_save.notable_form_sections.${section.status}`,
            { link },
            { link_title: section.title || section.formSection.title || "" },
          );

          return (
            <StatusList.Item
              key={section.formSection.id}
              status={menuStatusForFormSectionStatus(section.status)}
              id={`section-status-${section.formSection.id}`}
            >
              {content}
            </StatusList.Item>
          );
        })}

        {!summary.hasBlocks && !summary.hasWarnings && (
          <StatusList.Item status="accept" id="no-blocking-errors-or-warnings">
            {t("check_and_save.no_warnings")}
          </StatusList.Item>
        )}
        {summary.hasBlocks ? (
          <StatusList.Item status={summary.hasErrors ? "error" : "warning"} id="form-cannot-be-saved" emphasis padding>
            {t("check_and_save.can_not_save")}
          </StatusList.Item>
        ) : (
          <StatusList.Item status="accept" id="form-can-be-saved" emphasis padding>
            {t("check_and_save.can_save")}
          </StatusList.Item>
        )}
      </StatusList>

      {finalisationAllowed && (
        <BottomBar type="form">
          <BottomBar.Row>
            <Button type="submit" size="lg" disabled={status === "finalising"}>
              {t("save")}
            </Button>
            <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
          </BottomBar.Row>
        </BottomBar>
      )}
    </Form>
  );
}

function menuStatusForFormSectionStatus(status: DataEntryFormSectionStatus): MenuStatus {
  switch (status) {
    case "empty":
      return "empty";
    case "unaccepted-warnings":
      return "warning";
    case "accepted-warnings":
      return "accept";
    case "errors":
      return "error";
  }
}
