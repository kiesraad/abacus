import * as React from "react";

import { getErrorsAndWarnings, useVotersAndVotes, VotersAndVotesValues } from "@kiesraad/api";
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
import { deformatNumber } from "@kiesraad/util";

import { useWatchForChanges } from "../../useWatchForChanges";

interface FormElements extends HTMLFormControlsCollection {
  poll_card_count: HTMLInputElement;
  proxy_certificate_count: HTMLInputElement;
  voter_card_count: HTMLInputElement;
  total_admitted_voters_count: HTMLInputElement;
  votes_candidates_count: HTMLInputElement;
  blank_votes_count: HTMLInputElement;
  invalid_votes_count: HTMLInputElement;
  total_votes_cast_count: HTMLInputElement;
  poll_card_recount: HTMLInputElement;
  proxy_certificate_recount: HTMLInputElement;
  voter_card_recount: HTMLInputElement;
  total_admitted_voters_recount: HTMLInputElement;
}

interface VotersAndVotesFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function VotersAndVotesForm() {
  const formRef = React.useRef<VotersAndVotesFormElement>(null);
  const acceptWarningsRef = React.useRef<HTMLInputElement>(null);
  const recountTitleRef = React.useRef<HTMLHeadingElement>(null);

  const getValues = React.useCallback(() => {
    const form = formRef.current;
    if (!form) {
      return {
        voters_counts: {
          poll_card_count: 0,
          proxy_certificate_count: 0,
          voter_card_count: 0,
          total_admitted_voters_count: 0,
        },
        votes_counts: {
          votes_candidates_count: 0,
          blank_votes_count: 0,
          invalid_votes_count: 0,
          total_votes_cast_count: 0,
        },
        voters_recounts: undefined,
      };
    }
    const elements = form.elements;

    const values: VotersAndVotesValues = {
      voters_counts: {
        poll_card_count: deformatNumber(elements.poll_card_count.value),
        proxy_certificate_count: deformatNumber(elements.proxy_certificate_count.value),
        voter_card_count: deformatNumber(elements.voter_card_count.value),
        total_admitted_voters_count: deformatNumber(elements.total_admitted_voters_count.value),
      },
      votes_counts: {
        votes_candidates_count: deformatNumber(elements.votes_candidates_count.value),
        blank_votes_count: deformatNumber(elements.blank_votes_count.value),
        invalid_votes_count: deformatNumber(elements.invalid_votes_count.value),
        total_votes_cast_count: deformatNumber(elements.total_votes_cast_count.value),
      },
      voters_recounts: undefined,
    };
    const recountForm = recountTitleRef.current;
    if (recountForm) {
      values.voters_recounts = {
        poll_card_recount: deformatNumber(elements.poll_card_recount.value),
        proxy_certificate_recount: deformatNumber(elements.proxy_certificate_recount.value),
        voter_card_recount: deformatNumber(elements.voter_card_recount.value),
        total_admitted_voters_recount: deformatNumber(elements.total_admitted_voters_recount.value),
      };
    }
    return values;
  }, []);

  const getAcceptWarnings = React.useCallback(() => {
    const checkbox = acceptWarningsRef.current;
    if (checkbox) {
      return checkbox.checked;
    }
    return false;
  }, []);

  const { status, sectionValues, errors, warnings, isSaved, acceptWarnings, submit, recounted } = useVotersAndVotes(
    getValues,
    getAcceptWarnings,
  );

  const [warningsWarning, setWarningsWarning] = React.useState(false);

  const shouldWatch = warnings.length > 0 && isSaved;
  const { hasChanges } = useWatchForChanges(shouldWatch, sectionValues, getValues);

  React.useEffect(() => {
    if (hasChanges) {
      const checkbox = acceptWarningsRef.current;
      if (checkbox && checkbox.checked) checkbox.click();
      setWarningsWarning(false);
    }
  }, [hasChanges]);

  const handleSubmit = (event: React.FormEvent<VotersAndVotesFormElement>) =>
    void (async (event: React.FormEvent<VotersAndVotesFormElement>) => {
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

  const errorsAndWarnings = getErrorsAndWarnings(errors, warnings);

  React.useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved, warnings, errors]);

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
      id="voters_and_votes_form"
      title="Toegelaten kiezers en uitgebrachte stemmen"
    >
      {isSaved && hasValidationError && (
        <Feedback id="feedback-error" type="error" data={errors.map((error) => error.code)} />
      )}
      {isSaved && hasValidationWarning && !hasValidationError && (
        <Feedback id="feedback-warning" type="warning" data={warnings.map((warning) => warning.code)} />
      )}
      <InputGrid key="voters-and-votes">
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
            defaultValue={sectionValues.voters_counts.poll_card_count}
            {...defaultProps}
          />
          <InputGridRow
            key="B"
            field="B"
            id="proxy_certificate_count"
            title="Volmachtbewijzen"
            defaultValue={sectionValues.voters_counts.proxy_certificate_count}
            {...defaultProps}
          />
          <InputGridRow
            key="C"
            field="C"
            id="voter_card_count"
            title="Kiezerspassen"
            defaultValue={sectionValues.voters_counts.voter_card_count}
            {...defaultProps}
          />
          <InputGridRow
            key="D"
            field="D"
            id="total_admitted_voters_count"
            title="Totaal toegelaten kiezers"
            defaultValue={sectionValues.voters_counts.total_admitted_voters_count}
            isTotal
            addSeparator
            {...defaultProps}
          />

          <InputGridRow
            key="E"
            field="E"
            id="votes_candidates_count"
            title="Stemmen op kandidaten"
            defaultValue={sectionValues.votes_counts.votes_candidates_count}
            {...defaultProps}
          />
          <InputGridRow
            key="F"
            field="F"
            id="blank_votes_count"
            title="Blanco stemmen"
            defaultValue={sectionValues.votes_counts.blank_votes_count}
            {...defaultProps}
          />
          <InputGridRow
            key="G"
            field="G"
            id="invalid_votes_count"
            title="Ongeldige stemmen"
            defaultValue={sectionValues.votes_counts.invalid_votes_count}
            {...defaultProps}
          />
          <InputGridRow
            key="H"
            field="H"
            id="total_votes_cast_count"
            title="Totaal uitgebrachte stemmen"
            defaultValue={sectionValues.votes_counts.total_votes_cast_count}
            isTotal
            {...defaultProps}
          />
        </InputGrid.Body>
        {recounted && (
          <>
            <InputGrid.SectionTitleHeader>
              <h2 id="recounted_title" ref={recountTitleRef}>
                Toegelaten kiezers na hertelling door gemeentelijk stembureau
              </h2>
              <th>Veld</th>
              <th>Geteld aantal</th>
              <th>Omschrijving</th>
            </InputGrid.SectionTitleHeader>
            <InputGrid.Body>
              <InputGridRow
                key="A.2"
                field="A.2"
                id="poll_card_recount"
                title="Stempassen"
                defaultValue={sectionValues.voters_recounts?.poll_card_recount}
                {...defaultProps}
              />
              <InputGridRow
                key="B.2"
                field="B.2"
                id="proxy_certificate_recount"
                title="Volmachtbewijzen"
                defaultValue={sectionValues.voters_recounts?.proxy_certificate_recount}
                {...defaultProps}
              />
              <InputGridRow
                key="C.2"
                field="C.2"
                id="voter_card_recount"
                title="Kiezerspassen"
                defaultValue={sectionValues.voters_recounts?.voter_card_recount}
                {...defaultProps}
              />
              <InputGridRow
                key="D.2"
                field="D.2"
                id="total_admitted_voters_recount"
                title="Totaal toegelaten kiezers"
                defaultValue={sectionValues.voters_recounts?.total_admitted_voters_recount}
                isTotal
                {...defaultProps}
              />
            </InputGrid.Body>
          </>
        )}
      </InputGrid>

      <BottomBar type="input-grid">
        {warningsWarning && (
          <BottomBar.Row>
            <Alert type="error" variant="small">
              <p>Je kan alleen verder als je het papieren proces-verbaal hebt gecontroleerd.</p>
            </Alert>
          </BottomBar.Row>
        )}
        {showAcceptWarnings && (
          <BottomBar.Row>
            <Checkbox
              id="voters_and_votes_form_accept_warnings"
              defaultChecked={acceptWarnings}
              hasError={warningsWarning}
              ref={acceptWarningsRef}
              label="Ik heb de aantallen gecontroleerd met het papier en correct overgenomen."
            />
          </BottomBar.Row>
        )}
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
