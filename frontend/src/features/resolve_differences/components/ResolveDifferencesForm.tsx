import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t, tx } from "@/i18n/translate";

import { effectiveWrongEntryAction, type ResolveDifferencesFormState } from "../utils/differences";

export interface ResolveDifferencesFormProps {
  firstEntryName: string;
  secondEntryName: string;
  formState: ResolveDifferencesFormState;
  onSubmit: () => void | Promise<void>;
}

export function ResolveDifferencesForm({
  firstEntryName,
  secondEntryName,
  formState: {
    correctEntry,
    setCorrectEntry,
    wrongEntryAction,
    setWrongEntryAction,
    correctionBlocked,
    correctEntryError,
    wrongEntryError,
  },
  onSubmit,
}: ResolveDifferencesFormProps) {
  const wrongEntryDisabled = (correctEntry !== "first" && correctEntry !== "second") || correctionBlocked;
  const checkedAction = effectiveWrongEntryAction(correctEntry, wrongEntryAction, correctionBlocked);

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
    >
      <FormLayout>
        <FormLayout.Section title={t("resolve_differences.form_question")}>
          <p className="md">{t("resolve_differences.form_content")}</p>
          <ChoiceList>
            {correctEntryError && (
              <ChoiceList.Error id="resolve-differences-correct-entry-error">{correctEntryError}</ChoiceList.Error>
            )}
            <ChoiceList.Radio
              id="keep_first_entry"
              name="correct_entry"
              label={t("resolve_differences.options.keep_first_and_discard_second", { name: firstEntryName })}
              checked={correctEntry === "first"}
              onChange={() => {
                setCorrectEntry("first");
              }}
            />
            <ChoiceList.Radio
              id="keep_second_entry"
              name="correct_entry"
              label={t("resolve_differences.options.keep_second_and_discard_first", { name: secondEntryName })}
              checked={correctEntry === "second"}
              onChange={() => {
                setCorrectEntry("second");
              }}
            />
            <ChoiceList.Radio
              id="discard_both_entries"
              name="correct_entry"
              label={t("resolve_differences.options.discard_both")}
              checked={correctEntry === "neither"}
              onChange={() => {
                setCorrectEntry("neither");
              }}
            />
          </ChoiceList>
        </FormLayout.Section>
        <FormLayout.Section title={tx("resolve_differences.wrong_entry_question")}>
          {correctionBlocked && (
            <Alert type="notify" small>
              {t("resolve_differences.correction_blocked")}
            </Alert>
          )}
          <ChoiceList disabled={wrongEntryDisabled}>
            {wrongEntryError && (
              <ChoiceList.Error id="resolve-differences-wrong-entry-error">{wrongEntryError}</ChoiceList.Error>
            )}
            <ChoiceList.Radio
              id="correct_wrong_entry"
              name="wrong_entry_action"
              label={t("resolve_differences.wrong_entry_options.correct")}
              checked={checkedAction === "correct"}
              onChange={() => {
                setWrongEntryAction("correct");
              }}
            />
            <ChoiceList.Radio
              id="discard_wrong_entry"
              name="wrong_entry_action"
              label={t("resolve_differences.wrong_entry_options.discard")}
              checked={checkedAction === "discard"}
              onChange={() => {
                setWrongEntryAction("discard");
              }}
            />
          </ChoiceList>
        </FormLayout.Section>
        <FormLayout.Controls>
          <Button type="submit">
            {correctionBlocked ? t("resolve_differences.continue_to_resolve_errors") : t("save")}
          </Button>
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}
