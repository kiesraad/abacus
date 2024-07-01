import * as React from "react";

import { type ResultCode, usePollingStationDataEntry } from "@kiesraad/api";
import { Button, InputGrid, Feedback, FormField, BottomBar } from "@kiesraad/ui";
import {
  usePositiveNumberInputMask,
  usePreventFormEnterSubmit,
  fieldNameFromPath,
} from "@kiesraad/util";

//TODO: force from openapi types
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

//Future: move to generic place, same as ValidationResult but with client side errors
type ErrorsAndWarnings = {
  errors: ResultCode[];
  warnings: ResultCode[];
};

interface VotersAndVotesFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function VotersAndVotesForm() {
  const { register, format, deformat, warnings: inputMaskWarnings } = usePositiveNumberInputMask();
  const formRef = React.useRef<HTMLFormElement>(null);
  usePreventFormEnterSubmit(formRef);
  const [doSubmit, { data, loading, error }] = usePollingStationDataEntry({
    polling_station_id: 1,
    entry_number: 1,
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
      },
    });
  }

  const errorsAndWarnings: Map<string, ErrorsAndWarnings> = React.useMemo(() => {
    const result = new Map<string, ErrorsAndWarnings>();
    if (data && data.validation_results.errors.length > 0) {
      data.validation_results.errors.forEach((error) => {
        error.fields.forEach((f) => {
          const fieldName = fieldNameFromPath(f);
          if (!result.has(fieldName)) {
            result.set(fieldName, { errors: [], warnings: [] });
          }
          const field = result.get(fieldName);
          if (field) {
            field.errors.push(error.code);
          }
        });
      });
    }

    inputMaskWarnings.forEach((warning) => {
      if (!result.has(warning.anchor.id)) {
        result.set(warning.anchor.id, { errors: [], warnings: [] });
      }
      const field = result.get(warning.anchor.id);
      if (field) {
        field.warnings.push(warning.code as ResultCode);
      }
    });

    return result;
  }, [data, inputMaskWarnings]);

  const hasValidationError = data && data.validation_results.errors.length > 0;
  console.log(data);
  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <h2>Toegelaten kiezers en uitgebrachte stemmen</h2>
      {error && (
        <Feedback type="error" title="Error">
          <div>
            <h2>Error</h2>
            <p id="result">{error.message}</p>
          </div>
        </Feedback>
      )}
      {data && hasValidationError && (
        <Feedback type="error" title="Controleer uitgebrachte stemmen">
          <div>
            <ul>
              {data.validation_results.errors.map((error) => (
                <li key={error.code}>{error.code}</li>
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
      <InputGrid>
        <InputGrid.Header>
          <th>Veld</th>
          <th>Geteld aantal</th>
          <th>Omschrijving</th>
        </InputGrid.Header>
        <InputGrid.Body>
          <InputGrid.Row>
            <td>A</td>
            <td>
              <FormField error={errorsAndWarnings.get("poll_card_count")?.errors}>
                <input
                  id="poll_card_count"
                  name="poll_card_count"
                  maxLength={11}
                  {...register()}
                  defaultValue={format(pickGoodTestNumber())}
                />
              </FormField>
            </td>
            <td>Stempassen</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>B</td>
            <td>
              <FormField error={errorsAndWarnings.get("proxy_certificate_count")?.errors}>
                <input
                  id="proxy_certificate_count"
                  name="proxy_certificate_count"
                  maxLength={11}
                  {...register()}
                  defaultValue={format(pickGoodTestNumber())}
                />
              </FormField>
            </td>
            <td>Volmachtbewijzen</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>C</td>
            <td>
              <FormField error={errorsAndWarnings.get("voter_card_count")?.errors}>
                <input
                  id="voter_card_count"
                  name="voter_card_count"
                  maxLength={11}
                  {...register()}
                  defaultValue={format(pickGoodTestNumber())}
                />
              </FormField>
            </td>
            <td>Kiezerspassen</td>
          </InputGrid.Row>
          <InputGrid.Row isTotal>
            <td>D</td>
            <td>
              <FormField error={errorsAndWarnings.get("total_admitted_voters_count")?.errors}>
                <input
                  id="total_admitted_voters_count"
                  name="total_admitted_voters_count"
                  maxLength={11}
                  {...register()}
                  defaultValue={format(pickGoodTestNumber())}
                />
              </FormField>
            </td>
            <td>Totaal toegelaten kiezers</td>
          </InputGrid.Row>

          <InputGrid.Separator />

          <InputGrid.Row>
            <td>E</td>
            <td>
              <FormField error={errorsAndWarnings.get("votes_candidates_counts")?.errors}>
                <input
                  id="votes_candidates_counts"
                  name="votes_candidates_counts"
                  maxLength={11}
                  {...register()}
                  defaultValue={format(pickGoodTestNumber())}
                />
              </FormField>
            </td>
            <td>Stemmen op kandidaten</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>F</td>
            <td>
              <FormField error={errorsAndWarnings.get("blank_votes_count")?.errors}>
                <input
                  id="blank_votes_count"
                  name="blank_votes_count"
                  maxLength={11}
                  {...register()}
                  defaultValue={format(pickGoodTestNumber())}
                />
              </FormField>
            </td>
            <td>Blanco stemmen</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>G</td>
            <td>
              <FormField error={errorsAndWarnings.get("invalid_votes_count")?.errors}>
                <input
                  id="invalid_votes_count"
                  name="invalid_votes_count"
                  maxLength={11}
                  {...register()}
                  defaultValue={format(pickGoodTestNumber())}
                />
              </FormField>
            </td>
            <td>Ongeldige stemmen</td>
          </InputGrid.Row>
          <InputGrid.Row isTotal>
            <td>H</td>
            <td>
              <FormField error={errorsAndWarnings.get("total_votes_cast_count")?.errors}>
                <input
                  id="total_votes_cast_count"
                  name="total_votes_cast_count"
                  maxLength={11}
                  {...register()}
                  defaultValue={format(pickGoodTestNumber())}
                />
              </FormField>
            </td>
            <td>Totaal uitgebrachte stemmen</td>
          </InputGrid.Row>
        </InputGrid.Body>
      </InputGrid>
      <BottomBar type="form">
        <Button type="submit" size="lg" disabled={loading}>
          Volgende
        </Button>
        <span className="button_hint">SHIFT + Enter</span>
      </BottomBar>
    </form>
  );
}

//currently I want zeroes in the value
function pickGoodTestNumber() {
  const n = Math.ceil(Math.random() * 4) * 10 * 10;
  return Math.floor(Math.random() * n) * 10;
}
