import * as React from "react";
//import { useNavigate } from "react-router-dom";

import { PoliticalGroup, usePoliticalGroup } from "@kiesraad/api";
import { BottomBar, Button, Feedback, InputGrid } from "@kiesraad/ui";
import { usePositiveNumberInputMask, usePreventFormEnterSubmit } from "@kiesraad/util";
import { useBlocker } from "react-router-dom";

interface FormElements extends HTMLFormControlsCollection {
  listtotal: HTMLInputElement;
  "candidatevotes[]": HTMLInputElement[];
}

interface CandidatesVotesFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export interface CandidatesVotesFormProps {
  group: PoliticalGroup;
}

export function CandidatesVotesForm({ group }: CandidatesVotesFormProps) {
  //const navigate = useNavigate();
  const { register, format, deformat } = usePositiveNumberInputMask();
  const formRef = React.useRef<CandidatesVotesFormElement>(null);
  const {
    sectionValues,
    errors,
    warnings,
    setSectionValues,
    serverError,
    isCalled,
    setTemporaryCache,
  } = usePoliticalGroup(group.number);

  usePreventFormEnterSubmit(formRef);

  const getValues = React.useCallback(
    (elements: CandidatesVotesFormElement["elements"]) => {
      const candidate_votes = [];
      for (const el of elements["candidatevotes[]"]) {
        candidate_votes.push({
          number: candidateNumberFromElement(el),
          votes: deformat(el.value),
        });
      }
      return {
        number: group.number,
        total: parseInt(elements.listtotal.value),
        candidate_votes: candidate_votes,
      };
    },
    [deformat, group],
  );

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
    //navigate(`../list/${group.number + 1}`);
  }

  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <h2>{group.name}</h2>
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

      {hasValidationWarning && (
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
              <InputGrid.Row
                isFocused={index === 0}
                addSeparator={addSeparator}
                key={`list${group.number}-candidate${index + 1}`}
              >
                <td>{index + 1}</td>
                <td>
                  <input
                    id={`candidate-votes-${candidate.number}`}
                    name="candidatevotes[]"
                    maxLength={11}
                    {...register()}
                    /* eslint-disable-next-line jsx-a11y/no-autofocus */
                    autoFocus={index === 0}
                    defaultValue={format(defaultValue)}
                  />
                </td>
                <td>
                  {candidate.last_name}, {candidate.initials} ({candidate.first_name})
                </td>
              </InputGrid.Row>
            );
          })}
          <InputGrid.Total key={`list${group.number}-total`}>
            <td></td>
            <td>
              <input id={`list-total`} name="listtotal" maxLength={11} {...register()} />
            </td>
            <td>Totaal lijst {group.number}</td>
          </InputGrid.Total>
        </InputGrid.Body>
      </InputGrid>
      <BottomBar type="inputgrid">
        <Button type="submit" size="lg">
          Volgende
        </Button>
        <span className="button_hint">SHIFT + Enter</span>
      </BottomBar>
    </form>
  );
}

function candidateNumberFromElement(el: HTMLInputElement) {
  const id = el.id;
  const bits = id.split("-");
  const numberString = bits[bits.length - 1];
  if (numberString) {
    return parseInt(numberString);
  }
  return 0;
}
