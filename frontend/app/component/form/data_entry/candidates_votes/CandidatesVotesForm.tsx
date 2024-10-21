import * as React from "react";

import { CandidateVotes, getErrorsAndWarnings, PoliticalGroup, usePoliticalGroup } from "@kiesraad/api";
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
import { candidateNumberFromId, deformatNumber } from "@kiesraad/util";

import { useWatchForChanges } from "../../useWatchForChanges";

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
  const formRef = React.useRef<CandidatesVotesFormElement>(null);
  const acceptWarningsRef = React.useRef<HTMLInputElement>(null);
  const getValues = React.useCallback(() => {
    const form = formRef.current;
    if (!form) {
      return {
        number: group.number,
        total: 0,
        candidate_votes: [],
      };
    }

    const elements = form.elements;
    const candidate_votes: CandidateVotes[] = [];
    for (const el of elements["candidatevotes[]"]) {
      candidate_votes.push({
        number: candidateNumberFromId(el.id),
        votes: deformatNumber(el.value),
      });
    }
    return {
      number: group.number,
      total: deformatNumber(elements.total.value),
      candidate_votes: candidate_votes,
    };
  }, [group]);

  const getAcceptWarnings = React.useCallback(() => {
    const checkbox = acceptWarningsRef.current;
    if (checkbox) {
      return checkbox.checked;
    }
    return false;
  }, []);

  const { status, sectionValues, errors, warnings, isSaved, submit, acceptWarnings } = usePoliticalGroup(
    group.number,
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

  const errorsAndWarnings = getErrorsAndWarnings(errors, warnings);

  React.useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved, errors, warnings]);

  const [warningsWarning, setWarningsWarning] = React.useState(false);

  const handleSubmit = (event: React.FormEvent<CandidatesVotesFormElement>) =>
    void (async (event: React.FormEvent<CandidatesVotesFormElement>) => {
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
      id={`candidates_form_${group.number}`}
      title={`Lijst ${group.number} - ${group.name}`}
    >
      {isSaved && hasValidationError && (
        <Feedback id="feedback-error" type="error" data={errors.map((error) => error.code)} />
      )}
      {isSaved && hasValidationWarning && !hasValidationError && (
        <Feedback id="feedback-warning" type="warning" data={warnings.map((warning) => warning.code)} />
      )}
      <InputGrid key={`list${group.number}`} zebra>
        <InputGrid.Header>
          <th>Nummer</th>
          <th>Aantal stemmen</th>
          <th>Kandidaat</th>
        </InputGrid.Header>
        <InputGrid.Body>
          {group.candidates.map((candidate, index) => {
            const addSeparator = (index + 1) % 25 === 0 && index + 1 !== group.candidates.length;
            const defaultValue = sectionValues?.candidate_votes[index]?.votes || "";
            return (
              <InputGridRow
                key={`list${group.number}-candidate${index + 1}`}
                field={`${index + 1}`}
                name="candidatevotes[]"
                id={`candidate_votes[${candidate.number - 1}].votes`}
                title={`${candidate.last_name}, ${candidate.initials} (${candidate.first_name})`}
                addSeparator={addSeparator}
                defaultValue={defaultValue}
                {...defaultProps}
              />
            );
          })}
          <InputGridRow
            key={`list${group.number}-total`}
            field={``}
            name="total"
            id="total"
            title={`Totaal lijst ${group.number}`}
            defaultValue={sectionValues?.total || ""}
            isListTotal
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
              id={`candidates_votes_form_accept_warnings_${group.number}`}
              defaultChecked={acceptWarnings}
              hasError={warningsWarning}
              ref={acceptWarningsRef}
              label="Ik heb de aantallen gecontroleerd met het papier en correct overgenomen."
            />
          </BottomBar.Row>
        )}
        <BottomBar.Row>
          <KeyboardKeys.HintText>
            <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Down]} />
            Snel naar totaal van de lijst
          </KeyboardKeys.HintText>
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
