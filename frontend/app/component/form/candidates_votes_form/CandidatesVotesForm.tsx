import * as React from "react";

import {
  CandidateVotes,
  getErrorsAndWarnings,
  PoliticalGroup,
  usePoliticalGroup,
} from "@kiesraad/api";
import { BottomBar, Button, Checkbox, Feedback, InputGrid, InputGridRow } from "@kiesraad/ui";
import {
  candidateNumberFromId,
  usePositiveNumberInputMask,
  usePreventFormEnterSubmit,
} from "@kiesraad/util";

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

  const getValues = React.useCallback(() => {
    const form = document.getElementById(
      `candidates_form_${group.number}`,
    ) as CandidatesVotesFormElement;
    const elements = form.elements;
    const candidate_votes: CandidateVotes[] = [];
    for (const el of elements["candidatevotes[]"]) {
      candidate_votes.push({
        number: candidateNumberFromId(el.id),
        votes: deformat(el.value),
      });
    }
    return {
      number: group.number,
      total: deformat(elements.total.value),
      candidate_votes: candidate_votes,
    };
  }, [deformat, group]);

  const { sectionValues, errors, warnings, loading, isSaved, submit, ignoreWarnings } =
    usePoliticalGroup(group.number, getValues);

  usePreventFormEnterSubmit(formRef);

  const errorsAndWarnings = getErrorsAndWarnings(errors, warnings, inputMaskWarnings);

  React.useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved]);

  function handleSubmit(event: React.FormEvent<CandidatesVotesFormElement>) {
    event.preventDefault();
    submit();
  }

  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;

  return (
    <form onSubmit={handleSubmit} ref={formRef} id={`candidates_form_${group.number}`}>
      <h2>
        Lijst {group.number} - {group.name}
      </h2>
      {isSaved && hasValidationError && (
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
      {isSaved && hasValidationWarning && !hasValidationError && (
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
            const addSeparator = (index + 1) % 25 == 0 && index + 1 !== group.candidates.length;
            const defaultValue = sectionValues?.candidate_votes[index]?.votes || "";
            return (
              <InputGridRow
                key={`list${group.number}-candidate${index + 1}`}
                field={`${index + 1}`}
                name="candidatevotes[]"
                id={`candidate_votes[${candidate.number - 1}].votes`}
                title={`${candidate.last_name}, ${candidate.initials} (${candidate.first_name})`}
                errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
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
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={format(sectionValues?.total || "")}
            isListTotal
          />
        </InputGrid.Body>
      </InputGrid>
      <BottomBar type="inputgrid">
        <BottomBar.Row hidden={errors.length > 0 || warnings.length === 0}>
          <Checkbox id="voters_and_votes_form_ignore_warnings" defaultChecked={ignoreWarnings}>
            Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.
          </Checkbox>
        </BottomBar.Row>
        <BottomBar.Row>
          <Button type="submit" size="lg" disabled={loading}>
            Volgende
          </Button>
          <span className="button_hint">SHIFT + Enter</span>
        </BottomBar.Row>
      </BottomBar>
    </form>
  );
}
