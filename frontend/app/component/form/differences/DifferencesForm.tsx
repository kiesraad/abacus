import * as React from "react";

import { getErrorsAndWarnings, useDifferences } from "@kiesraad/api";
import {
  BottomBar,
  Button,
  Checkbox,
  Feedback,
  InputGrid,
  InputGridRow,
  useTooltip,
} from "@kiesraad/ui";
import { usePositiveNumberInputMask, usePreventFormEnterSubmit } from "@kiesraad/util";

interface FormElements extends HTMLFormControlsCollection {
  more_ballots_count: HTMLInputElement;
  fewer_ballots_count: HTMLInputElement;
  unreturned_ballots_count: HTMLInputElement;
  too_few_ballots_handed_out_count: HTMLInputElement;
  too_many_ballots_handed_out_count: HTMLInputElement;
  other_explanation_count: HTMLInputElement;
  no_explanation_count: HTMLInputElement;
}

interface DifferencesFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function DifferencesForm() {
  const {
    register,
    format,
    deformat,
    warnings: inputMaskWarnings,
    resetWarnings,
  } = usePositiveNumberInputMask();
  const formRef = React.useRef<HTMLFormElement>(null);
  usePreventFormEnterSubmit(formRef);
  const [hideIgnoreWarnings, setHideIgnoreWarnings] = React.useState(false);
  const getValues = React.useCallback(() => {
    const form = document.getElementById("differences_form") as DifferencesFormElement;
    const elements = form.elements;
    return {
      differences_counts: {
        more_ballots_count: deformat(elements.more_ballots_count.value),
        fewer_ballots_count: deformat(elements.fewer_ballots_count.value),
        unreturned_ballots_count: deformat(elements.unreturned_ballots_count.value),
        too_few_ballots_handed_out_count: deformat(elements.too_few_ballots_handed_out_count.value),
        too_many_ballots_handed_out_count: deformat(
          elements.too_many_ballots_handed_out_count.value,
        ),
        other_explanation_count: deformat(elements.other_explanation_count.value),
        no_explanation_count: deformat(elements.no_explanation_count.value),
      },
    };
  }, [deformat]);

  const { sectionValues, loading, errors, warnings, isSaved, submit, ignoreWarnings } =
    useDifferences(getValues);

  useTooltip({
    onDismiss: resetWarnings,
  });

  function handleSubmit(event: React.FormEvent<DifferencesFormElement>) {
    event.preventDefault();
    submit();
  }

  const errorsAndWarnings = getErrorsAndWarnings(errors, warnings, inputMaskWarnings);

  React.useEffect(() => {
    if (isSaved && warnings.length > 0) {
      const onKeyUp = () => {
        setHideIgnoreWarnings(true);
        document.removeEventListener("keyup", onKeyUp);
      };

      document.addEventListener("keyup", onKeyUp);
      return () => {
        document.removeEventListener("keyup", onKeyUp);
      };
    }
  }, [isSaved, warnings]);

  React.useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved]);

  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;

  return (
    <form onSubmit={handleSubmit} ref={formRef} id="differences_form">
      <h2>Verschil tussen aantal kiezers en getelde stemmen</h2>
      {isSaved && hasValidationError && (
        <Feedback type="error" title="Controleer ingevulde verschillen">
          <div id="feedback-error">
            <ul>
              {errors.map((error, n) => (
                <li key={`${error.code}-${n}`}>{error.code}</li>
              ))}
            </ul>
          </div>
        </Feedback>
      )}
      {isSaved && hasValidationWarning && !hasValidationError && (
        <Feedback type="warning" title="Controleer ingevulde verschillen">
          <div id="feedback-warning">
            <ul>
              {warnings.map((warning, n) => (
                <li key={`${warning.code}-${n}`}>{warning.code}</li>
              ))}
            </ul>
          </div>
        </Feedback>
      )}
      <InputGrid key="differences">
        <InputGrid.Header>
          <th>Veld</th>
          <th>Geteld aantal</th>
          <th>Omschrijving</th>
        </InputGrid.Header>
        <InputGrid.Body>
          <InputGridRow
            key="I"
            field="I"
            id="more_ballots_count"
            title="Stembiljetten méér geteld"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.differences_counts.more_ballots_count}
            isFocused
          />
          <InputGridRow
            key="J"
            field="J"
            id="fewer_ballots_count"
            title="Stembiljetten minder geteld"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.differences_counts.fewer_ballots_count}
            addSeparator
          />

          <InputGridRow
            key="K"
            field="K"
            id="unreturned_ballots_count"
            title="Niet ingeleverde stembiljetten"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.differences_counts.unreturned_ballots_count}
          />
          <InputGridRow
            key="L"
            field="L"
            id="too_few_ballots_handed_out_count"
            title="Te weinig uitgerekte stembiljetten"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.differences_counts.too_few_ballots_handed_out_count}
          />
          <InputGridRow
            key="M"
            field="M"
            id="too_many_ballots_handed_out_count"
            title="Te veel uitgereikte stembiljetten"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.differences_counts.too_many_ballots_handed_out_count}
          />
          <InputGridRow
            key="N"
            field="N"
            id="other_explanation_count"
            title="Andere verklaring voor het verschil"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.differences_counts.other_explanation_count}
            addSeparator
          />

          <InputGridRow
            key="O"
            field="O"
            id="no_explanation_count"
            title="Geen verklaring voor het verschil"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.differences_counts.no_explanation_count}
          />
        </InputGrid.Body>
      </InputGrid>
      <BottomBar type="inputgrid">
        <BottomBar.Row hidden={errors.length > 0 || hideIgnoreWarnings || warnings.length === 0}>
          <Checkbox id="voters_and_votes_form_ignore_warnings" defaultChecked={ignoreWarnings}>
            Ik heb de aantallen gecontroleerd met papier en correct overgenomen.
          </Checkbox>
        </BottomBar.Row>
        <BottomBar.Row>
          <Button type="submit" size="lg" disabled={loading}>
            Volgende
          </Button>
          <span className="button_hint">SHIFT + Enter</span>
        </BottomBar.Row>
      </BottomBar>
    </form>
  );
}
