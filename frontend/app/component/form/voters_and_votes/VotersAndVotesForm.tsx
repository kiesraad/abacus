import * as React from "react";

import { getErrorsAndWarnings, useVotersAndVotes } from "@kiesraad/api";
import { BottomBar, Button, Feedback, InputGrid, InputGridRow, useTooltip } from "@kiesraad/ui";
import { usePositiveNumberInputMask, usePreventFormEnterSubmit } from "@kiesraad/util";

interface FormElements extends HTMLFormControlsCollection {
  poll_card_count: HTMLInputElement;
  proxy_certificate_count: HTMLInputElement;
  voter_card_count: HTMLInputElement;
  total_admitted_voters_count: HTMLInputElement;
  votes_candidates_counts: HTMLInputElement;
  blank_votes_count: HTMLInputElement;
  invalid_votes_count: HTMLInputElement;
  total_votes_cast_count: HTMLInputElement;
}

interface VotersAndVotesFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function VotersAndVotesForm() {
  const {
    register,
    format,
    deformat,
    warnings: inputMaskWarnings,
    resetWarnings,
  } = usePositiveNumberInputMask();
  const formRef = React.useRef<HTMLFormElement>(null);
  usePreventFormEnterSubmit(formRef);

  const getValues = React.useCallback(() => {
    const form = document.getElementById("voters_and_votes_form") as HTMLFormElement;
    const elements = form.elements as VotersAndVotesFormElement["elements"];
    return {
      voters_counts: {
        poll_card_count: deformat(elements.poll_card_count.value),
        proxy_certificate_count: deformat(elements.proxy_certificate_count.value),
        voter_card_count: deformat(elements.voter_card_count.value),
        total_admitted_voters_count: deformat(elements.total_admitted_voters_count.value),
      },
      votes_counts: {
        votes_candidates_counts: deformat(elements.votes_candidates_counts.value),
        blank_votes_count: deformat(elements.blank_votes_count.value),
        invalid_votes_count: deformat(elements.invalid_votes_count.value),
        total_votes_cast_count: deformat(elements.total_votes_cast_count.value),
      },
    };
  }, [deformat]);

  const { sectionValues, loading, errors, warnings, isCalled, submit } =
    useVotersAndVotes(getValues);

  useTooltip({
    onDismiss: resetWarnings,
  });

  function handleSubmit(event: React.FormEvent<VotersAndVotesFormElement>) {
    event.preventDefault();
    submit();
  }

  const errorsAndWarnings = getErrorsAndWarnings(errors, warnings, inputMaskWarnings);

  React.useEffect(() => {
    if (isCalled) {
      window.scrollTo(0, 0);
    }
  }, [isCalled]);

  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;
  return (
    <form onSubmit={handleSubmit} ref={formRef} id="voters_and_votes_form">
      <h2>Toegelaten kiezers en uitgebrachte stemmen</h2>

      {hasValidationError && (
        <Feedback type="error" title="Controleer uitgebrachte stemmen">
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
        <Feedback type="warning" title="Controleer uitgebrachte stemmen">
          <div id="feedback-warning">
            <ul>
              {warnings.map((warning, n) => (
                <li key={`${warning.code}-${n}`}>{warning.code}</li>
              ))}
            </ul>
          </div>
        </Feedback>
      )}
      <InputGrid key="numbers">
        <InputGrid.Header>
          <th>Veld</th>
          <th>Geteld aantal</th>
          <th>Omschrijving</th>
        </InputGrid.Header>
        <InputGrid.Body>
          <InputGridRow
            key="A"
            field="A"
            id="poll_card_count"
            title="Stempassen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.voters_counts.poll_card_count}
            isFocused
          />
          <InputGridRow
            key="B"
            field="B"
            id="proxy_certificate_count"
            title="Volmachtbewijzen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            defaultValue={sectionValues.voters_counts.proxy_certificate_count}
            format={format}
          />
          <InputGridRow
            key="C"
            field="C"
            id="voter_card_count"
            title="Kiezerspassen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.voters_counts.voter_card_count}
          />
          <InputGridRow
            key="D"
            field="D"
            id="total_admitted_voters_count"
            title="Totaal toegelaten kiezers"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.voters_counts.total_admitted_voters_count}
            isTotal
            addSeparator
          />

          <InputGridRow
            key="E"
            field="E"
            id="votes_candidates_counts"
            title="Stemmen op kandidaten"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.votes_candidates_counts}
          />
          <InputGridRow
            key="F"
            field="F"
            id="blank_votes_count"
            title="Blanco stemmen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.blank_votes_count}
          />
          <InputGridRow
            key="G"
            field="G"
            id="invalid_votes_count"
            title="Ongeldige stemmen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.invalid_votes_count}
          />
          <InputGridRow
            key="H"
            field="H"
            id="total_votes_cast_count"
            title="Totaal uitgebrachte stemmen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.total_votes_cast_count}
            isTotal
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
