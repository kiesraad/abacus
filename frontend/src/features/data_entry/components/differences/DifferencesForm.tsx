import { ApiError } from "@/api/ApiResult";
import { ErrorModal } from "@/components/error/ErrorModal";
import { Alert } from "@/components/ui/Alert/Alert";
import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/CheckboxAndRadio/CheckboxAndRadio";
import { Feedback } from "@/components/ui/Feedback/Feedback";
import { Form } from "@/components/ui/Form/Form";
import { InputGrid } from "@/components/ui/InputGrid/InputGrid";
import { InputGridRow } from "@/components/ui/InputGrid/InputGridRow";
import { KeyboardKeys } from "@/components/ui/KeyboardKeys/KeyboardKeys";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import { KeyboardKey } from "@/types/ui";

import { DataEntryNavigation } from "../DataEntryNavigation";
import { formValuesToValues } from "./differencesValues";
import { useDifferences } from "./useDifferences";

export function DifferencesForm() {
  const { isTypist } = useUserRole();
  const {
    error,
    formRef,
    onSubmit,
    currentValues,
    setValues,
    formSection,
    status,
    setAcceptErrorsAndWarnings,
    defaultProps,
    showAcceptErrorsAndWarnings,
  } = useDifferences();

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
      ref={formRef}
      id="differences_form"
      title={t("differences.differences_form_title")}
    >
      <DataEntryNavigation
        onSubmit={onSubmit}
        currentValues={{ differences_counts: formValuesToValues(currentValues) }}
      />
      {error instanceof ApiError && <ErrorModal error={error} />}
      {formSection.isSaved && !formSection.errors.isEmpty() && (
        <Feedback id="feedback-error" type="error" data={formSection.errors.getCodes()} isTypist={isTypist} />
      )}
      {formSection.isSaved && !formSection.warnings.isEmpty() && formSection.errors.isEmpty() && (
        <Feedback id="feedback-warning" type="warning" data={formSection.warnings.getCodes()} isTypist={isTypist} />
      )}
      <InputGrid key="differences">
        <InputGrid.Header>
          <th>{t("field")}</th>
          <th>{t("counted_number")}</th>
          <th>{t("description")}</th>
        </InputGrid.Header>
        <InputGrid.Body>
          <InputGridRow
            autoFocusInput
            key="I"
            field="I"
            id="data.differences_counts.more_ballots_count"
            title={t("differences.more_ballots_count")}
            value={currentValues.more_ballots_count}
            onChange={(e) => {
              setValues({ ...currentValues, more_ballots_count: e.target.value });
            }}
            {...defaultProps}
          />
          <InputGridRow
            key="J"
            field="J"
            id="data.differences_counts.fewer_ballots_count"
            title={t("differences.fewer_ballots_count")}
            value={currentValues.fewer_ballots_count}
            onChange={(e) => {
              setValues({ ...currentValues, fewer_ballots_count: e.target.value });
            }}
            addSeparator
            {...defaultProps}
          />

          <InputGridRow
            key="K"
            field="K"
            id="data.differences_counts.unreturned_ballots_count"
            title={t("differences.unreturned_ballots_count")}
            value={currentValues.unreturned_ballots_count}
            onChange={(e) => {
              setValues({ ...currentValues, unreturned_ballots_count: e.target.value });
            }}
            {...defaultProps}
          />
          <InputGridRow
            key="L"
            field="L"
            id="data.differences_counts.too_few_ballots_handed_out_count"
            title={t("differences.too_few_ballots_handed_out_count")}
            value={currentValues.too_few_ballots_handed_out_count}
            onChange={(e) => {
              setValues({ ...currentValues, too_few_ballots_handed_out_count: e.target.value });
            }}
            {...defaultProps}
          />
          <InputGridRow
            key="M"
            field="M"
            id="data.differences_counts.too_many_ballots_handed_out_count"
            title={t("differences.too_many_ballots_handed_out_count")}
            value={currentValues.too_many_ballots_handed_out_count}
            onChange={(e) => {
              setValues({ ...currentValues, too_many_ballots_handed_out_count: e.target.value });
            }}
            {...defaultProps}
          />
          <InputGridRow
            key="N"
            field="N"
            id="data.differences_counts.other_explanation_count"
            title={t("differences.other_explanation_count")}
            value={currentValues.other_explanation_count}
            onChange={(e) => {
              setValues({ ...currentValues, other_explanation_count: e.target.value });
            }}
            addSeparator
            {...defaultProps}
          />

          <InputGridRow
            key="O"
            field="O"
            id="data.differences_counts.no_explanation_count"
            title={t("differences.no_explanation_count")}
            value={currentValues.no_explanation_count}
            onChange={(e) => {
              setValues({ ...currentValues, no_explanation_count: e.target.value });
            }}
            {...defaultProps}
          />
        </InputGrid.Body>
      </InputGrid>
      <BottomBar type="inputGrid">
        {formSection.acceptErrorsAndWarningsError && (
          <BottomBar.Row>
            <Alert type="error" small>
              <p>{t("data_entry.continue_after_check")}</p>
            </Alert>
          </BottomBar.Row>
        )}
        {showAcceptErrorsAndWarnings && (
          <BottomBar.Row>
            <Checkbox
              id="differences_form_accept_warnings"
              checked={formSection.acceptErrorsAndWarnings}
              hasError={formSection.acceptErrorsAndWarningsError}
              onChange={(e) => {
                setAcceptErrorsAndWarnings(e.target.checked);
              }}
              label={t("data_entry.form_accept_warnings")}
            />
          </BottomBar.Row>
        )}
        <BottomBar.Row>
          <Button type="submit" size="lg" disabled={status === "saving"}>
            {t("next")}
          </Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </BottomBar.Row>
      </BottomBar>
    </Form>
  );
}
