import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t, tx } from "@/i18n/translate";

import type { ResolveDifferencesFormState } from "../utils/differences";

export interface ResolveDifferencesFormProps extends ResolveDifferencesFormState {
  firstEntryName: string;
  secondEntryName: string;
  onSubmit: () => void | Promise<void>;
}

export function ResolveDifferencesForm({
  firstEntryName,
  secondEntryName,
  correctEntry,
  setCorrectEntry,
  wrongEntryAction,
  setWrongEntryAction,
  correctEntryError,
  wrongEntryError,
  onSubmit,
}: ResolveDifferencesFormProps) {
  // The second question only applies when one of the two entries is kept.
  const wrongEntryDisabled = correctEntry !== "first" && correctEntry !== "second";

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
          <ChoiceList disabled={wrongEntryDisabled}>
            {wrongEntryError && (
              <ChoiceList.Error id="resolve-differences-wrong-entry-error">{wrongEntryError}</ChoiceList.Error>
            )}
            <ChoiceList.Radio
              id="correct_wrong_entry"
              name="wrong_entry_action"
              label={t("resolve_differences.wrong_entry_options.correct")}
              checked={wrongEntryAction === "correct"}
              onChange={() => {
                setWrongEntryAction("correct");
              }}
            />
            <ChoiceList.Radio
              id="reenter_wrong_entry"
              name="wrong_entry_action"
              label={t("resolve_differences.wrong_entry_options.reenter")}
              checked={wrongEntryAction === "reenter"}
              onChange={() => {
                setWrongEntryAction("reenter");
              }}
            />
          </ChoiceList>
        </FormLayout.Section>
        <FormLayout.Controls>
          <Button type="submit">{t("save")}</Button>
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}
