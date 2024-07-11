import * as React from "react";

import { usePollingStationDataEntry, ValidationResult, ErrorsAndWarnings } from "@kiesraad/api";
import { Button, InputGrid, Feedback, BottomBar, InputGridRow, useTooltip } from "@kiesraad/ui";
import {
  usePositiveNumberInputMask,
  usePreventFormEnterSubmit,
  fieldNameFromPath,
} from "@kiesraad/util";

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
  const [doSubmit, { data, loading, error }] = usePollingStationDataEntry({
    polling_station_id: 1,
    entry_number: 1,
  });

  useTooltip({
    onDismiss: resetWarnings,
  });

  function handleSubmit(event: React.FormEvent<VotersAndVotesFormElement>) {
    event.preventDefault();
    const elements = event.currentTarget.elements;

    doSubmit({
      data: {
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
        differences_counts: {
          more_ballots_count: 0,
          fewer_ballots_count: 0,
          unreturned_ballots_count: 0,
          too_few_ballots_handed_out_count: 0,
          too_many_ballots_handed_out_count: 0,
          other_explanation_count: 0,
          no_explanation_count: 0,
        },
        political_group_votes: [
          {
            candidate_votes: [{ number: 1, votes: 0 }],
            number: 1,
            total: 0,
          },
        ],
      },
    });
  }

  const errorsAndWarnings: Map<string, ErrorsAndWarnings> = React.useMemo(() => {
    const result = new Map<string, ErrorsAndWarnings>();

    const process = (target: keyof ErrorsAndWarnings, arr: ValidationResult[]) => {
      arr.forEach((v) => {
        v.fields.forEach((f) => {
          const fieldName = fieldNameFromPath(f);
          if (!result.has(fieldName)) {
            result.set(fieldName, { errors: [], warnings: [] });
          }
          const field = result.get(fieldName);
          if (field) {
            field[target].push({
              code: v.code,
              id: fieldName,
            });
          }
        });
      });
    };

    if (data && data.validation_results.errors.length > 0) {
      process("errors", data.validation_results.errors);
    }
    if (data && data.validation_results.warnings.length > 0) {
      process("warnings", data.validation_results.warnings);
    }

    inputMaskWarnings.forEach((warning) => {
      if (!result.has(warning.id)) {
        result.set(warning.id, { errors: [], warnings: [] });
      }
      const field = result.get(warning.id);
      if (field) {
        field.warnings.push(warning);
      }
    });

    return result;
  }, [data, inputMaskWarnings]);

  React.useEffect(() => {
    if (data) {
      window.scrollTo(0, 0);
    }
  }, [data]);

  const hasValidationError = data && data.validation_results.errors.length > 0;
  const hasValidationWarning = data && data.validation_results.warnings.length > 0;

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <div id="error-codes" className="hidden">
        {data && data.validation_results.errors.map((r) => r.code).join(",")}
      </div>
      <h2>Toegelaten kiezers en uitgebrachte stemmen</h2>
      {error && (
        <Feedback type="error" title="Error">
          <div>
            <h2>Error</h2>
            <p id="result">{error.message}</p>
          </div>
        </Feedback>
      )}
      {hasValidationError && (
        <Feedback type="error" title="Controleer uitgebrachte stemmen">
          <div>
            <ul>
              {data.validation_results.errors.map((error, n) => (
                <li key={`${error.code}-${n}`}>{error.code}</li>
              ))}
            </ul>
          </div>
        </Feedback>
      )}

      {hasValidationWarning && (
        <Feedback type="warning" title="Controleer uitgebrachte stemmen">
          <div>
            <ul>
              {data.validation_results.warnings.map((warning, n) => (
                <li key={`${warning.code}-${n}`}>{warning.code}</li>
              ))}
            </ul>
          </div>
        </Feedback>
      )}

      {data && !hasValidationError && (
        <Feedback type="success" title="Success">
          <div>
            <h2 id="result">Success</h2>
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
            name="poll_card_count"
            title="Stempassen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            isFocused
          />
          <InputGridRow
            key="B"
            field="B"
            name="proxy_certificate_count"
            title="Volmachtbewijzen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
          />
          <InputGridRow
            key="C"
            field="C"
            name="voter_card_count"
            title="Kiezerspassen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
          />
          <InputGridRow
            key="D"
            field="D"
            name="total_admitted_voters_count"
            title="Totaal toegelaten kiezers"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            isTotal
            addSeparator
          />

          <InputGridRow
            key="E"
            field="E"
            name="votes_candidates_counts"
            title="Stemmen op kandidaten"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
          />
          <InputGridRow
            key="F"
            field="F"
            name="blank_votes_count"
            title="Blanco stemmen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
          />
          <InputGridRow
            key="G"
            field="G"
            name="invalid_votes_count"
            title="Ongeldige stemmen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
          />
          <InputGridRow
            key="H"
            field="H"
            name="total_votes_cast_count"
            title="Totaal uitgebrachte stemmen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
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
