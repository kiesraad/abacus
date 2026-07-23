import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t } from "@/i18n/translate";
import type { ResolveDifferencesAction } from "@/types/generated/openapi";

export interface ResolveDifferencesFormProps {
  firstEntryName: string;
  secondEntryName: string;
  action: ResolveDifferencesAction | undefined;
  setAction: (action: ResolveDifferencesAction | undefined) => void;
  validationError: string | undefined;
  onSubmit: () => void | Promise<void>;
}

export function ResolveDifferencesForm({
  firstEntryName,
  secondEntryName,
  action,
  setAction,
  validationError,
  onSubmit,
}: ResolveDifferencesFormProps) {
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
            {validationError && <ChoiceList.Error id="resolve-differences-error">{validationError}</ChoiceList.Error>}
            <ChoiceList.Radio
              id="keep_first_and_discard_second"
              label={t("resolve_differences.options.keep_first_and_discard_second", { name: firstEntryName })}
              checked={action === "keep_first_and_discard_second"}
              onChange={() => {
                setAction("keep_first_and_discard_second");
              }}
            />
            <ChoiceList.Radio
              id="keep_second_and_discard_first"
              label={t("resolve_differences.options.keep_second_and_discard_first", { name: secondEntryName })}
              checked={action === "keep_second_and_discard_first"}
              onChange={() => {
                setAction("keep_second_and_discard_first");
              }}
            />
            <ChoiceList.Radio
              id="discard_both"
              label={t("resolve_differences.options.discard_both")}
              checked={action === "discard_both"}
              onChange={() => {
                setAction("discard_both");
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
