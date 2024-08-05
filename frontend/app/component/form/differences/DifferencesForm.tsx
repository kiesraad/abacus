import * as React from "react";
import { useBlocker } from "react-router-dom";

import { DifferencesCounts, useDifferences, useErrorsAndWarnings } from "@kiesraad/api";
import { BottomBar, Button, Feedback, InputGrid, InputGridRow, useTooltip } from "@kiesraad/ui";
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
  const {
    sectionValues,
    setSectionValues,
    loading,
    errors,
    warnings,
    serverError,
    isCalled,
    setTemporaryCache,
  } = useDifferences();

  useTooltip({
    onDismiss: resetWarnings,
  });

  const getValues = React.useCallback(
    (elements: DifferencesFormElement["elements"]): DifferencesCounts => {
      return {
        more_ballots_count: deformat(elements.more_ballots_count.value),
        fewer_ballots_count: deformat(elements.fewer_ballots_count.value),
        unreturned_ballots_count: deformat(elements.unreturned_ballots_count.value),
        too_few_ballots_handed_out_count: deformat(elements.too_few_ballots_handed_out_count.value),
        too_many_ballots_handed_out_count: deformat(
          elements.too_many_ballots_handed_out_count.value,
        ),
        other_explanation_count: deformat(elements.other_explanation_count.value),
        no_explanation_count: deformat(elements.no_explanation_count.value),
      };
    },
    [deformat],
  );

  function handleSubmit(event: React.FormEvent<DifferencesFormElement>) {
    event.preventDefault();
    const elements = event.currentTarget.elements;
    setSectionValues(getValues(elements));
  }
  //const blocker =  useBlocker() use const blocker to render confirmation UI.
  useBlocker(() => {
    if (formRef.current && !isCalled) {
      const elements = formRef.current.elements as DifferencesFormElement["elements"];
      const values = getValues(elements);
      setTemporaryCache({
        key: "differences",
        data: values,
      });
    }
    return false;
  });

  const errorsAndWarnings = useErrorsAndWarnings(errors, warnings, inputMaskWarnings);

  React.useEffect(() => {
    if (isCalled) {
      window.scrollTo(0, 0);
    }
  }, [isCalled]);

  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;
  const success = isCalled && !hasValidationError && !hasValidationWarning && !loading;
  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      {/* Temporary while not navigating through form sections */}
      {success && <div id="result">Success</div>}
      <h2>Verschil tussen aantal kiezers en getelde stemmen</h2>
      {serverError && (
        <Feedback type="error" title="Error">
          <div id="feedback-server-error">
            <h2>Error</h2>
            <p id="result">{serverError.message}</p>
          </div>
        </Feedback>
      )}
      {hasValidationError && (
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

      {hasValidationWarning && !hasValidationError && (
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
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.more_ballots_count}
            isFocused
          />
          <InputGridRow
            key="J"
            field="J"
            id="fewer_ballots_count"
            title="Stembiljetten minder geteld"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.fewer_ballots_count}
            addSeparator
          />

          <InputGridRow
            key="K"
            field="K"
            id="unreturned_ballots_count"
            title="Niet ingeleverde stembiljetten"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.unreturned_ballots_count}
          />
          <InputGridRow
            key="L"
            field="L"
            id="too_few_ballots_handed_out_count"
            title="Te weinig uitgerekte stembiljetten"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.too_few_ballots_handed_out_count}
          />

          <InputGridRow
            key="M"
            field="M"
            id="too_many_ballots_handed_out_count"
            title="Teveel uitgereikte stembiljetten"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.too_many_ballots_handed_out_count}
          />
          <InputGridRow
            key="N"
            field="N"
            id="other_explanation_count"
            title="Andere verklaring voor het verschil"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.other_explanation_count}
            addSeparator
          />

          <InputGridRow
            key="O"
            field="O"
            id="no_explanation_count"
            title="Geen verklaring voor het verschil"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.no_explanation_count}
          />
        </InputGrid.Body>
      </InputGrid>
      <BottomBar type="inputgrid">
        <Button type="submit" size="lg" disabled={loading}>
          Volgende
        </Button>
        <span className="button_hint">SHIFT + Enter</span>
      </BottomBar>
    </form>
  );
}
