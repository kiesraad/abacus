import * as React from "react";
import { useBlocker, useNavigate } from "react-router-dom";

import {
  ValidationResult,
  ErrorsAndWarnings,
  useVotersAndVotes,
  VotersAndVotesValues,
} from "@kiesraad/api";
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
  const navigate = useNavigate();
  const {
    sectionValues,
    setSectionValues,
    loading,
    errors,
    warnings,
    serverError,
    isCalled,
    setTemporaryCache,
  } = useVotersAndVotes();

  useTooltip({
    onDismiss: resetWarnings,
  });

  const getValues = React.useCallback(
    (elements: VotersAndVotesFormElement["elements"]): VotersAndVotesValues => {
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
    },
    [deformat],
  );

  function handleSubmit(event: React.FormEvent<VotersAndVotesFormElement>) {
    event.preventDefault();
    const elements = event.currentTarget.elements;
    setSectionValues(getValues(elements));
  }
  //const blocker =  useBlocker() use const blocker to render confirmation UI.
  useBlocker(() => {
    if (formRef.current && !isCalled) {
      const elements = formRef.current.elements as VotersAndVotesFormElement["elements"];
      const values = getValues(elements);
      setTemporaryCache({
        key: "voters_and_votes",
        data: values,
      });
    }
    return false;
  });

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

    if (errors.length > 0) {
      process("errors", errors);
    }
    if (warnings.length > 0) {
      process("warnings", warnings);
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
  }, [errors, warnings, inputMaskWarnings]);

  React.useEffect(() => {
    if (isCalled) {
      window.scrollTo(0, 0);
    }
  }, [isCalled]);

  React.useEffect(() => {
    if (isCalled) {
      if (errors.length === 0 && warnings.length === 0) {
        navigate("../differences");
      }
    }
  }, [errors, warnings, isCalled, navigate]);

  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <div id="error-codes" className="hidden">
        {errors.map((r) => r.code).join(",")}
      </div>
      <h2>Toegelaten kiezers en uitgebrachte stemmen</h2>
      {serverError && (
        <Feedback type="error" title="Error">
          <div>
            <h2>Error</h2>
            <p id="result">{serverError.message}</p>
          </div>
        </Feedback>
      )}
      {hasValidationError && (
        <Feedback type="error" title="Controleer uitgebrachte stemmen">
          <div>
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
          <div>
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
            name="poll_card_count"
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
            name="proxy_certificate_count"
            title="Volmachtbewijzen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            defaultValue={sectionValues.voters_counts.proxy_certificate_count}
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
            defaultValue={sectionValues.voters_counts.poll_card_count}
          />
          <InputGridRow
            key="D"
            field="D"
            name="total_admitted_voters_count"
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
            name="votes_candidates_counts"
            title="Stemmen op kandidaten"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.votes_candidates_counts}
          />
          <InputGridRow
            key="F"
            field="F"
            name="blank_votes_count"
            title="Blanco stemmen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.blank_votes_count}
          />
          <InputGridRow
            key="G"
            field="G"
            name="invalid_votes_count"
            title="Ongeldige stemmen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.invalid_votes_count}
          />
          <InputGridRow
            key="H"
            field="H"
            name="total_votes_cast_count"
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
