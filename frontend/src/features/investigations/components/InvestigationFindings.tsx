import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t } from "@/i18n/translate";
import { StringFormData } from "@/utils/stringFormData";

export function InvestigationFindings() {
  const navigate = useNavigate();
  const [nonEmptyError, setNonEmptyError] = useState(false);
  const [radioError, setRadioError] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setNonEmptyError(false);
    setRadioError(false);

    const formData = new StringFormData(event.currentTarget);
    const findings = formData.getString("findings");
    const correctedResultsChoice = formData.get("corrected_results");

    let error = false;

    if (findings.length === 0) {
      setNonEmptyError(true);
      error = true;
    }

    if (correctedResultsChoice === null) {
      setRadioError(true);
      error = true;
    }

    if (error) {
      return;
    }

    // TODO: Handle form submission
    // const correctedResults = correctedResultsChoice === "yes";
    // console.log({ findings, correctedResults });
    void navigate("../../../");
  };

  return (
    <Form title={t("investigations.findings.investigation_findings_title")} onSubmit={handleSubmit}>
      <FormLayout>
        <FormLayout.Section>
          <ul className="mt-0 mb-0">
            <li>{t("investigations.findings.note_investigation_result")}</li>
            <li>{t("investigations.findings.indicate_how_result_was_determined")}</li>
          </ul>
          <InputField
            type="text"
            fieldSize="text-area"
            name="findings"
            label={t("investigations.findings.title")}
            error={nonEmptyError ? t("form_errors.FORM_VALIDATION_RESULT_REQUIRED") : undefined}
            hint={t("investigations.findings.hint")}
          />
          <ChoiceList>
            <ChoiceList.Legend>{t("investigations.findings.corrected_result")}</ChoiceList.Legend>
            {radioError && (
              <ChoiceList.Error id="corrected_results_error">
                {t("investigations.pick_corrected_result")}
              </ChoiceList.Error>
            )}
            <ChoiceList.Radio id="corrected_results_yes" name="corrected_results" value="yes" label={t("yes")}>
              {t("investigations.findings.corrected_result_yes")}
            </ChoiceList.Radio>
            <ChoiceList.Radio id="corrected_results_no" name="corrected_results" value="no" label={t("no")}>
              {t("investigations.findings.corrected_result_no")}
            </ChoiceList.Radio>
          </ChoiceList>
        </FormLayout.Section>
        <FormLayout.Controls>
          <Button type="submit">{t("save")}</Button>
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}
