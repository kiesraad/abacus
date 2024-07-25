import * as React from "react";
import { useBlocker } from "react-router-dom";

import {
  CandidateVotes,
  PoliticalGroup,
  PoliticalGroupVotes,
  useErrorsAndWarnings,
  usePoliticalGroup,
} from "@kiesraad/api";
import { BottomBar, Button, Feedback, InputGrid, InputGridRow } from "@kiesraad/ui";
import { usePositiveNumberInputMask, usePreventFormEnterSubmit } from "@kiesraad/util";

interface FormElements extends HTMLFormControlsCollection {
  total: HTMLInputElement;
  "candidatevotes[]": HTMLInputElement[];
}

interface CandidatesVotesFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export interface CandidatesVotesFormProps {
  group: PoliticalGroup;
}

export function CandidatesVotesForm({ group }: CandidatesVotesFormProps) {
  const { register, format, deformat, warnings: inputMaskWarnings } = usePositiveNumberInputMask();
  const formRef = React.useRef<CandidatesVotesFormElement>(null);
  const {
    sectionValues,
    errors,
    warnings,
    setSectionValues,
    loading,
    serverError,
    isCalled,
    setTemporaryCache,
  } = usePoliticalGroup(group.number);

  usePreventFormEnterSubmit(formRef);

  const getValues = React.useCallback(
    (elements: CandidatesVotesFormElement["elements"]): PoliticalGroupVotes => {
      const candidate_votes: CandidateVotes[] = [];
      for (const el of elements["candidatevotes[]"]) {
        candidate_votes.push({
          number: candidateNumberFromElement(el),
          votes: deformat(el.value),
        });
      }
      return {
        number: group.number,
        total: deformat(elements.total.value),
        candidate_votes: candidate_votes,
      };
    },
    [deformat, group],
  );

  const errorsAndWarnings = useErrorsAndWarnings(errors, warnings, inputMaskWarnings);

  //const blocker =  useBlocker() use const blocker to render confirmation UI.
  useBlocker(() => {
    if (formRef.current && !isCalled) {
      const elements = formRef.current.elements;
      const values = getValues(elements);
      setTemporaryCache({
        key: "political_group_votes",
        id: group.number,
        data: values,
      });
    }
    return false;
  });

  function handleSubmit(event: React.FormEvent<CandidatesVotesFormElement>) {
    event.preventDefault();
    const elements = event.currentTarget.elements;
    setSectionValues(getValues(elements));
  }

  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;
  const success = isCalled && !hasValidationError && !hasValidationWarning && !loading;
  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      {/* Temporary while not navigating through form sections */}
      {success && <div id="result">Success</div>}
      <h2>{group.name}</h2>
      {serverError && (
        <Feedback type="error" title="Error">
          <div id="feedback-server-error">
            <h2>Error</h2>
            <p id="result">{serverError.message}</p>
          </div>
        </Feedback>
      )}
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
      <InputGrid key={`list${group.number}`} zebra>
        <InputGrid.Header>
          <th>Nummer</th>
          <th>Aantal stemmen</th>
          <th>Kandidaat</th>
        </InputGrid.Header>
        <InputGrid.Body>
          {group.candidates.map((candidate, index) => {
            const addSeparator = (index + 1) % 25 == 0;
            const defaultValue = sectionValues?.candidate_votes[index]?.votes || "";
            return (
              <InputGridRow
                key={`list${group.number}-candidate${index + 1}`}
                field={`${index + 1}`}
                name="candidatevotes[]"
                id={`candidate_votes[${candidate.number - 1}].votes`}
                title={`${candidate.last_name}, ${candidate.initials} (${candidate.first_name})`}
                errorsAndWarnings={errorsAndWarnings}
                inputProps={register()}
                format={format}
                addSeparator={addSeparator}
                defaultValue={defaultValue}
                isFocused={index === 0}
              />
            );
          })}
          <InputGridRow
            key={`list${group.number}-total`}
            field={``}
            name="total"
            id="total"
            title={`Totaal lijst ${group.number}`}
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={format(sectionValues?.total || "")}
            isListTotal
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

function candidateNumberFromElement(el: HTMLInputElement) {
  const id = el.id;
  const bits = id.split("[");
  const numberString = bits[bits.length - 1];
  if (numberString) {
    return parseInt(numberString) + 1;
  }
  return 0;
}
