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
import { candidateNumberFromId, usePositiveNumberInputMask } from "@kiesraad/util";

import { useWatchForChanges } from "../../useWatchForChanges.ts";

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

  const _IGNORE_WARNINGS_ID = `candidates_votes_form_ignore_warnings_${group.number}`;

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
        votes: deformat(el.value),
      });
    }
    return {
      number: group.number,
      total: deformat(elements.total.value),
      candidate_votes: candidate_votes,
    };
  }, [deformat, group]);

  const getIgnoreWarnings = React.useCallback(() => {
    const checkbox = document.getElementById(_IGNORE_WARNINGS_ID) as HTMLInputElement | null;
    if (checkbox) {
      return checkbox.checked;
    }
    return false;
  }, [_IGNORE_WARNINGS_ID]);

  const { status, sectionValues, errors, warnings, isSaved, submit, ignoreWarnings } = usePoliticalGroup(
    group.number,
    getValues,
    getIgnoreWarnings,
  );

  const shouldWatch = warnings.length > 0 && isSaved;
  const { hasChanges } = useWatchForChanges(shouldWatch, sectionValues, getValues);

  React.useEffect(() => {
    if (hasChanges) {
      const checkbox = document.getElementById(_IGNORE_WARNINGS_ID) as HTMLInputElement;
      if (checkbox.checked) checkbox.click();
      setWarningsWarning(false);
    }
  }, [hasChanges, _IGNORE_WARNINGS_ID]);

  const errorsAndWarnings = getErrorsAndWarnings(errors, warnings, inputMaskWarnings);

  React.useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved]);

  const [warningsWarning, setWarningsWarning] = React.useState(false);

  const handleSubmit = (event: React.FormEvent<CandidatesVotesFormElement>) =>
    void (async (event: React.FormEvent<CandidatesVotesFormElement>) => {
      event.preventDefault();

      if (errors.length === 0 && warnings.length > 0) {
        const ignoreWarnings = (
          document.getElementById(`candidates_votes_form_ignore_warnings_${group.number}`) as HTMLInputElement
        ).checked;
        if (!hasChanges && !ignoreWarnings) {
          setWarningsWarning(true);
        } else {
          try {
            await submit(ignoreWarnings);
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

  const defaultProps = {
    errorsAndWarnings: isSaved ? errorsAndWarnings : undefined,
    warningsAccepted: getIgnoreWarnings(),
    inputProps: register(),
    format,
  };

  return (
    <Form onSubmit={handleSubmit} ref={formRef} id={`candidates_form_${group.number}`}>
      <h2>
        Lijst {group.number} - {group.name}
      </h2>
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
            const addSeparator = (index + 1) % 25 == 0 && index + 1 !== group.candidates.length;
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
                isFocused={index === 0}
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
            defaultValue={format(sectionValues?.total || "")}
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
        <BottomBar.Row hidden={errors.length > 0 || warnings.length === 0 || hasChanges}>
          <Checkbox id={_IGNORE_WARNINGS_ID} defaultChecked={ignoreWarnings} hasError={warningsWarning}>
            Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.
          </Checkbox>
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
