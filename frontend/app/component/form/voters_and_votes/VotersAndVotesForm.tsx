import * as React from "react";

import { getErrorsAndWarnings, useVotersAndVotes, VotersAndVotesValues } from "@kiesraad/api";
import {
  Alert,
  BottomBar,
  Button,
  Checkbox,
  Feedback,
  InputGrid,
  InputGridRow,
  useTooltip,
} from "@kiesraad/ui";
import { usePositiveNumberInputMask, usePreventFormEnterSubmit } from "@kiesraad/util";

import { useWatchForChanges } from "../useWatchForChanges";

const _IGNORE_WARNINGS_ID = "voters_and_votes_form_ignore_warnings";

interface FormElements extends HTMLFormControlsCollection {
  poll_card_count: HTMLInputElement;
  proxy_certificate_count: HTMLInputElement;
  voter_card_count: HTMLInputElement;
  total_admitted_voters_count: HTMLInputElement;
  votes_candidates_counts: HTMLInputElement;
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
  const {
    register,
    format,
    deformat,
    warnings: inputMaskWarnings,
    resetWarnings,
  } = usePositiveNumberInputMask();
  const formRef = React.useRef<VotersAndVotesFormElement>(null);
  usePreventFormEnterSubmit(formRef);

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
          votes_candidates_counts: 0,
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
      voters_recounts: undefined,
    };
    const recountForm = document.getElementById("recounted_title");
    if (recountForm) {
      values.voters_recounts = {
        poll_card_recount: deformat(elements.poll_card_recount.value),
        proxy_certificate_recount: deformat(elements.proxy_certificate_recount.value),
        voter_card_recount: deformat(elements.voter_card_recount.value),
        total_admitted_voters_recount: deformat(elements.total_admitted_voters_recount.value),
      };
    }
    return values;
  }, [deformat]);

  const getIgnoreWarnings = React.useCallback(() => {
    const checkbox = document.getElementById(_IGNORE_WARNINGS_ID) as HTMLInputElement;
    return checkbox.checked;
  }, []);

  const { sectionValues, loading, errors, warnings, isSaved, ignoreWarnings, submit, recounted } =
    useVotersAndVotes(getValues, getIgnoreWarnings);

  useTooltip({
    onDismiss: resetWarnings,
  });

  const [warningsWarning, setWarningsWarning] = React.useState(false);

  const shouldWatch = warnings.length > 0 && isSaved;
  const { hasChanges } = useWatchForChanges(shouldWatch, sectionValues, getValues);

  React.useEffect(() => {
    if (hasChanges) {
      const checkbox = document.getElementById(_IGNORE_WARNINGS_ID) as HTMLInputElement;
      checkbox.checked = false;
      setWarningsWarning(false);
    }
  }, [hasChanges]);

  function handleSubmit(event: React.FormEvent<VotersAndVotesFormElement>) {
    event.preventDefault();
    const ignoreWarnings = (document.getElementById(_IGNORE_WARNINGS_ID) as HTMLInputElement)
      .checked;

    if (!hasChanges && warnings.length > 0 && !ignoreWarnings) {
      setWarningsWarning(true);
    } else {
      submit(ignoreWarnings);
    }
  }

  const errorsAndWarnings = getErrorsAndWarnings(errors, warnings, inputMaskWarnings);

  React.useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved]);

  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;

  return (
    <form onSubmit={handleSubmit} ref={formRef} id="voters_and_votes_form">
      <h2>Toegelaten kiezers en uitgebrachte stemmen</h2>
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
            id="poll_card_count"
            title="Stempassen"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.voters_counts.poll_card_count}
            isFocused
          />
          <InputGridRow
            key="B"
            field="B"
            id="proxy_certificate_count"
            title="Volmachtbewijzen"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            defaultValue={sectionValues.voters_counts.proxy_certificate_count}
            format={format}
          />
          <InputGridRow
            key="C"
            field="C"
            id="voter_card_count"
            title="Kiezerspassen"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.voters_counts.voter_card_count}
          />
          <InputGridRow
            key="D"
            field="D"
            id="total_admitted_voters_count"
            title="Totaal toegelaten kiezers"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.voters_counts.total_admitted_voters_count}
            isTotal
            addSeparator
          />

          <InputGridRow
            key="E"
            field="E"
            id="votes_candidates_counts"
            title="Stemmen op kandidaten"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.votes_candidates_counts}
          />
          <InputGridRow
            key="F"
            field="F"
            id="blank_votes_count"
            title="Blanco stemmen"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.blank_votes_count}
          />
          <InputGridRow
            key="G"
            field="G"
            id="invalid_votes_count"
            title="Ongeldige stemmen"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.invalid_votes_count}
          />
          <InputGridRow
            key="H"
            field="H"
            id="total_votes_cast_count"
            title="Totaal uitgebrachte stemmen"
            errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.total_votes_cast_count}
            isTotal
          />
        </InputGrid.Body>
        {recounted && (
          <>
            <InputGrid.SectionTitleHeader>
              <h2 id="recounted_title">
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
                errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
                inputProps={register()}
                format={format}
                defaultValue={sectionValues.voters_recounts?.poll_card_recount}
              />
              <InputGridRow
                key="B.2"
                field="B.2"
                id="proxy_certificate_recount"
                title="Volmachtbewijzen"
                errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
                inputProps={register()}
                defaultValue={sectionValues.voters_recounts?.proxy_certificate_recount}
                format={format}
              />
              <InputGridRow
                key="C.2"
                field="C.2"
                id="voter_card_recount"
                title="Kiezerspassen"
                errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
                inputProps={register()}
                format={format}
                defaultValue={sectionValues.voters_recounts?.voter_card_recount}
              />
              <InputGridRow
                key="D.2"
                field="D.2"
                id="total_admitted_voters_recount"
                title="Totaal toegelaten kiezers"
                errorsAndWarnings={isSaved ? errorsAndWarnings : undefined}
                inputProps={register()}
                format={format}
                defaultValue={sectionValues.voters_recounts?.total_admitted_voters_recount}
                isTotal
              />
            </InputGrid.Body>
          </>
        )}
      </InputGrid>

      <BottomBar type="inputgrid">
        {warningsWarning && (
          <BottomBar.Row>
            <Alert type="error" variant="small">
              <p>Je kan alleen verder als je het het papieren proces-verbaal hebt gecontroleerd.</p>
            </Alert>
          </BottomBar.Row>
        )}
        <BottomBar.Row hidden={errors.length > 0 || warnings.length === 0 || hasChanges}>
          <Checkbox id={_IGNORE_WARNINGS_ID} defaultChecked={ignoreWarnings}>
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
