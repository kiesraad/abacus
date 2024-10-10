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
import { deformatNumber } from "@kiesraad/util";

import { useWatchForChanges } from "../../useWatchForChanges";

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
  const formRef = React.useRef<DifferencesFormElement>(null);
  const acceptWarningsRef = React.useRef<HTMLInputElement>(null);

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
        more_ballots_count: deformatNumber(elements.more_ballots_count.value),
        fewer_ballots_count: deformatNumber(elements.fewer_ballots_count.value),
        unreturned_ballots_count: deformatNumber(elements.unreturned_ballots_count.value),
        too_few_ballots_handed_out_count: deformatNumber(elements.too_few_ballots_handed_out_count.value),
        too_many_ballots_handed_out_count: deformatNumber(elements.too_many_ballots_handed_out_count.value),
        other_explanation_count: deformatNumber(elements.other_explanation_count.value),
        no_explanation_count: deformatNumber(elements.no_explanation_count.value),
      },
    };
  }, [formRef]);

  const getAcceptWarnings = React.useCallback(() => {
    const checkbox = acceptWarningsRef.current;
    if (checkbox) {
      return checkbox.checked;
    }
    return false;
  }, []);

  const { status, sectionValues, errors, warnings, isSaved, submit, acceptWarnings } = useDifferences(
    getValues,
    getAcceptWarnings,
  );

  const shouldWatch = warnings.length > 0 && isSaved;
  const { hasChanges } = useWatchForChanges(shouldWatch, sectionValues, getValues);

  React.useEffect(() => {
    if (hasChanges) {
      const checkbox = acceptWarningsRef.current;
      if (checkbox && checkbox.checked) checkbox.click();
      setWarningsWarning(false);
    }
  }, [hasChanges]);

  const [warningsWarning, setWarningsWarning] = React.useState(false);

  const handleSubmit = (event: React.FormEvent<DifferencesFormElement>) =>
    void (async (event: React.FormEvent<DifferencesFormElement>) => {
      event.preventDefault();

      if (errors.length === 0 && warnings.length > 0) {
        const acceptWarnings = acceptWarningsRef.current?.checked || false;
        if (!hasChanges && !acceptWarnings) {
          setWarningsWarning(true);
        } else {
          try {
            await submit({ acceptWarnings });
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

  const errorsAndWarnings = getErrorsAndWarnings(errors, warnings);

  React.useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved, errors, warnings]);

  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;
  const showAcceptWarnings = errors.length === 0 && warnings.length > 0 && !hasChanges;

  const defaultProps = {
    errorsAndWarnings: isSaved ? errorsAndWarnings : undefined,
    warningsAccepted: getAcceptWarnings(),
  };

  return (
    <Form
      onSubmit={handleSubmit}
      ref={formRef}
      id="differences_form"
      title="Verschillen tussen toegelaten kiezers en uitgebrachte stemmen"
    >
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
            defaultValue={sectionValues.differences_counts.more_ballots_count}
            {...defaultProps}
          />
          <InputGridRow
            key="J"
            field="J"
            id="fewer_ballots_count"
            title="Stembiljetten minder geteld"
            defaultValue={sectionValues.differences_counts.fewer_ballots_count}
            addSeparator
            {...defaultProps}
          />

          <InputGridRow
            key="K"
            field="K"
            id="unreturned_ballots_count"
            title="Niet ingeleverde stembiljetten"
            defaultValue={sectionValues.differences_counts.unreturned_ballots_count}
            {...defaultProps}
          />
          <InputGridRow
            key="L"
            field="L"
            id="too_few_ballots_handed_out_count"
            title="Te weinig uitgereikte stembiljetten"
            defaultValue={sectionValues.differences_counts.too_few_ballots_handed_out_count}
            {...defaultProps}
          />
          <InputGridRow
            key="M"
            field="M"
            id="too_many_ballots_handed_out_count"
            title="Te veel uitgereikte stembiljetten"
            defaultValue={sectionValues.differences_counts.too_many_ballots_handed_out_count}
            {...defaultProps}
          />
          <InputGridRow
            key="N"
            field="N"
            id="other_explanation_count"
            title="Andere verklaring voor het verschil"
            defaultValue={sectionValues.differences_counts.other_explanation_count}
            addSeparator
            {...defaultProps}
          />

          <InputGridRow
            key="O"
            field="O"
            id="no_explanation_count"
            title="Geen verklaring voor het verschil"
            defaultValue={sectionValues.differences_counts.no_explanation_count}
            {...defaultProps}
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
        {showAcceptWarnings && (
          <BottomBar.Row>
            <Checkbox
              id="differences_form_accept_warnings"
              defaultChecked={acceptWarnings}
              hasError={warningsWarning}
              ref={acceptWarningsRef}
              label="Ik heb de aantallen gecontroleerd met het papier en correct overgenomen."
            />
          </BottomBar.Row>
        )}
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
