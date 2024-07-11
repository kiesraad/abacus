import * as React from "react";

import { usePollingStationDataEntry, ValidationResult, ErrorsAndWarnings } from "@kiesraad/api";
import { Button, InputGrid, Feedback, BottomBar, InputGridRow, useTooltip } from "@kiesraad/ui";
import {
  usePositiveNumberInputMask,
  usePreventFormEnterSubmit,
  fieldNameFromPath,
} from "@kiesraad/util";

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
  const [doSubmit, { data, loading, error }] = usePollingStationDataEntry({
    polling_station_id: 1,
    entry_number: 1,
  });

  useTooltip({
    onDismiss: resetWarnings,
  });

  function handleSubmit(event: React.FormEvent<DifferencesFormElement>) {
    event.preventDefault();
    const elements = event.currentTarget.elements;

    doSubmit({
      data: {
        voters_counts: {
          poll_card_count: 0,
          proxy_certificate_count: 0,
          voter_card_count: 0,
          total_admitted_voters_count: 0,
        },
        votes_counts: {
          votes_candidates_counts: 0,
          blank_votes_count: 0,
          invalid_votes_count: 0,
          total_votes_cast_count: 0,
        },
        differences_counts: {
          more_ballots_count: deformat(elements.more_ballots_count.value),
          fewer_ballots_count: deformat(elements.fewer_ballots_count.value),
          unreturned_ballots_count: deformat(elements.unreturned_ballots_count.value),
          too_few_ballots_handed_out_count: deformat(
            elements.too_few_ballots_handed_out_count.value,
          ),
          too_many_ballots_handed_out_count: deformat(
            elements.too_many_ballots_handed_out_count.value,
          ),
          other_explanation_count: deformat(elements.other_explanation_count.value),
          no_explanation_count: deformat(elements.no_explanation_count.value),
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
      <h2>Verschil tussen aantal kiezers en getelde stemmen</h2>
      {error && (
        <Feedback type="error" title="Error">
          <div>
            <h2>Error</h2>
            <p id="result">{error.message}</p>
          </div>
        </Feedback>
      )}
      {hasValidationError && (
        <Feedback type="error" title="Controleer ingevulde verschillen">
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
        <Feedback type="warning" title="Controleer ingevulde verschillen">
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
            name="more_ballots_count"
            title="Stembiljetten méér geteld"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            isFocused
          />
          <InputGridRow
            key="J"
            field="J"
            name="fewer_ballots_count"
            title="Stembiljetten minder geteld"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            addSeparator
          />

          <InputGridRow
            key="K"
            field="K"
            name="unreturned_ballots_count"
            title="Niet ingeleverde stembiljetten"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
          />
          <InputGridRow
            key="L"
            field="L"
            name="too_few_ballots_handed_out_count"
            title="Te weinig uitgerekte stembiljetten"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
          />

          <InputGridRow
            key="M"
            field="M"
            name="too_many_ballots_handed_out_count"
            title="Teveel uitgereikte stembiljetten"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
          />
          <InputGridRow
            key="N"
            field="N"
            name="other_explanation_count"
            title="Andere verklaring voor het verschil"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            addSeparator
          />

          <InputGridRow
            key="O"
            field="O"
            name="no_explanation_count"
            title="Geen verklaring voor het verschil"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
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
