import * as React from "react";

import { getErrorsAndWarnings, useDifferences } from "@kiesraad/api";
import {
  Alert,
  BottomBar,
  Button,
  Checkbox,
  Feedback,
  Form,
  InputGrid,
  InputGridRow,
  KeyboardKey,
  KeyboardKeys,
} from "@kiesraad/ui";
import { usePositiveNumberInputMask } from "@kiesraad/util";

import { useWatchForChanges } from "../useWatchForChanges";

const _IGNORE_WARNINGS_ID = "differences_form_ignore_warnings";

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
  const { register, format, deformat, warnings: inputMaskWarnings } = usePositiveNumberInputMask();
  const formRef = React.useRef<DifferencesFormElement>(null);

  const getValues = React.useCallback(() => {
    const form = formRef.current;
    if (!form) {
      return {
        differences_counts: {
          more_ballots_count: 0,
          fewer_ballots_count: 0,
          unreturned_ballots_count: 0,
          too_few_ballots_handed_out_count: 0,
          too_many_ballots_handed_out_count: 0,
          other_explanation_count: 0,
          no_explanation_count: 0,
        },
      };
    }
    const elements = form.elements;
    return {
      differences_counts: {
        more_ballots_count: deformat(elements.more_ballots_count.value),
        fewer_ballots_count: deformat(elements.fewer_ballots_count.value),
        unreturned_ballots_count: deformat(elements.unreturned_ballots_count.value),
        too_few_ballots_handed_out_count: deformat(elements.too_few_ballots_handed_out_count.value),
        too_many_ballots_handed_out_count: deformat(elements.too_many_ballots_handed_out_count.value),
        other_explanation_count: deformat(elements.other_explanation_count.value),
        no_explanation_count: deformat(elements.no_explanation_count.value),
      },
    };
  }, [formRef, deformat]);

  const getIgnoreWarnings = React.useCallback(() => {
    const checkbox = document.getElementById(_IGNORE_WARNINGS_ID) as HTMLInputElement | null;
    if (checkbox) {
      return checkbox.checked;
    }
    return false;
  }, []);

  const { status, sectionValues, errors, warnings, isSaved, submit, ignoreWarnings } = useDifferences(
    getValues,
    getIgnoreWarnings,
  );

  const shouldWatch = warnings.length > 0 && isSaved;
  const { hasChanges } = useWatchForChanges(shouldWatch, sectionValues, getValues);

  React.useEffect(() => {
    if (hasChanges) {
      const checkbox = document.getElementById(_IGNORE_WARNINGS_ID) as HTMLInputElement;
      if (checkbox.checked) checkbox.click();
      setWarningsWarning(false);
    }
  }, [hasChanges]);

  const [warningsWarning, setWarningsWarning] = React.useState(false);

  const handleSubmit = (event: React.FormEvent<DifferencesFormElement>) =>
    void (async (event: React.FormEvent<DifferencesFormElement>) => {
      event.preventDefault();

      if (errors.length === 0 && warnings.length > 0) {
        const ignoreWarnings = (document.getElementById(_IGNORE_WARNINGS_ID) as HTMLInputElement).checked;
        if (!hasChanges && !ignoreWarnings) {
          setWarningsWarning(true);
        } else {
          try {
            await submit(ignoreWarnings);
          } catch (e) {
            console.error("Error saving data entry", e);
          }
        }
      } else {
        try {
          await submit();
        } catch (e) {
          console.error("Error saving data entry", e);
        }
      }
    })(event);

  const errorsAndWarnings = getErrorsAndWarnings(errors, warnings, inputMaskWarnings);

  React.useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved, errors, warnings]);

  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;

  return (
    <Form onSubmit={handleSubmit} ref={formRef} id="differences_form">
      <h2>Verschillen tussen toegelaten kiezers en uitgebrachte stemmen</h2>
      {isSaved && hasValidationError && (
        <Feedback id="feedback-error" type="error" data={errors.map((error) => error.code)} />
      )}
      {isSaved && hasValidationWarning && !hasValidationError && (
        <Feedback id="feedback-warning" type="warning" data={warnings.map((warning) => warning.code)} />
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
            warningsAccepted={getIgnoreWarnings()}
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
            warningsAccepted={getIgnoreWarnings()}
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
            warningsAccepted={getIgnoreWarnings()}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.differences_counts.unreturned_ballots_count}
          />
          <InputGridRow
            key="L"
            field="L"
            id="too_few_ballots_handed_out_count"
            title="Te weinig uitgereikte stembiljetten"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            warningsAccepted={getIgnoreWarnings()}
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
            warningsAccepted={getIgnoreWarnings()}
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
            warningsAccepted={getIgnoreWarnings()}
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
            warningsAccepted={getIgnoreWarnings()}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.differences_counts.no_explanation_count}
          />
        </InputGrid.Body>
      </InputGrid>
      <BottomBar type="input-grid">
        {warningsWarning && (
          <BottomBar.Row>
            <Alert type="error" variant="small">
              <p>Je kan alleen verder als je het het papieren proces-verbaal hebt gecontroleerd.</p>
            </Alert>
          </BottomBar.Row>
        )}
        <BottomBar.Row hidden={errors.length > 0 || warnings.length === 0 || hasChanges}>
          <Checkbox id={_IGNORE_WARNINGS_ID} defaultChecked={ignoreWarnings} hasError={warningsWarning}>
            Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.
          </Checkbox>
        </BottomBar.Row>
        <BottomBar.Row>
          <Button type="submit" size="lg" disabled={status.current === "saving"}>
            Volgende
          </Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </BottomBar.Row>
      </BottomBar>
    </Form>
  );
}
