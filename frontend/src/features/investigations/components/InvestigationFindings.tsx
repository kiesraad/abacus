import { FormEvent, useState } from "react";
import { Form, useNavigate } from "react-router";

import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t, tx } from "@/i18n/translate";
import { StringFormData } from "@/utils/stringFormData";

export function InvestigationFindings() {
  const navigate = useNavigate();
  const [nonEmptyError, setNonEmptyError] = useState(false);
  const [radioError, setRadioError] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

    setNonEmptyError(false);
    setRadioError(false);

    // TODO: Handle form submission
    // const correctedResults = correctedResultsChoice === "yes";
    // console.log({ findings, correctedResults });
    void navigate("../../../");
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormLayout>
        <FormLayout.Section>
          <div>
            <h2>{t("investigations.findings.investigation_findings_title")}</h2>
            {tx("investigations.findings.instructions")}
          </div>
          <FormLayout.Row>
            <InputField
              type="text"
              fieldSize="text-area"
              name="findings"
              label={t("investigations.findings.title")}
              error={nonEmptyError ? t("form_errors.FORM_VALIDATION_RESULT_REQUIRED") : undefined}
              hint={t("investigations.findings.hint")}
            />
          </FormLayout.Row>
          <FormLayout.Row>
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
          </FormLayout.Row>
        </FormLayout.Section>
        <FormLayout.Controls>
          <BottomBar>
            <BottomBar.Row>
              <Button type="submit">{t("save")}</Button>
            </BottomBar.Row>
          </BottomBar>
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}
