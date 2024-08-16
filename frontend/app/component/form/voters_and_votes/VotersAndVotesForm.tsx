import * as React from "react";
import { useBlocker } from "react-router-dom";

import { useErrorsAndWarnings, useVotersAndVotes, VotersAndVotesValues } from "@kiesraad/api";
import { BottomBar, Button, Feedback, InputGrid, InputGridRow, useTooltip } from "@kiesraad/ui";
import { usePositiveNumberInputMask, usePreventFormEnterSubmit } from "@kiesraad/util";

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
  const formRef = React.useRef<HTMLFormElement>(null);
  usePreventFormEnterSubmit(formRef);

  const {
    sectionValues,
    setSectionValues,
    loading,
    errors,
    warnings,
    serverError,
    isCalled,
    setTemporaryCache,
    recounted,
  } = useVotersAndVotes();

  useTooltip({
    onDismiss: resetWarnings,
  });

  const getValues = React.useCallback(
    (elements: VotersAndVotesFormElement["elements"]): VotersAndVotesValues => {
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
      if (recounted) {
        values.voters_recounts = {
          poll_card_recount: deformat(elements.poll_card_recount.value),
          proxy_certificate_recount: deformat(elements.proxy_certificate_recount.value),
          voter_card_recount: deformat(elements.voter_card_recount.value),
          total_admitted_voters_recount: deformat(elements.total_admitted_voters_recount.value),
        };
      }
      return values;
    },
    [deformat, recounted],
  );

  const errorsAndWarnings = useErrorsAndWarnings(errors, warnings, inputMaskWarnings);

  //const blocker = useBlocker() use const blocker to render confirmation UI.
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

  function handleSubmit(event: React.FormEvent<VotersAndVotesFormElement>) {
    event.preventDefault();
    const elements = event.currentTarget.elements;
    setSectionValues(getValues(elements));
  }

  React.useEffect(() => {
    if (isCalled) {
      window.scrollTo(0, 0);
    }
  }, [isCalled]);

  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;
  const success =
    isCalled && !serverError && !hasValidationError && !hasValidationWarning && !loading;
  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      {/* Temporary while not navigating through form sections */}
      {success && <div id="result">Success</div>}
      <h2>Toegelaten kiezers en uitgebrachte stemmen</h2>
      {serverError && <Feedback id="feedback-server-error" type="error" data={serverError} />}
      {hasValidationError && (
        <Feedback id="feedback-error" type="error" data={errors.map((error) => error.code)} />
      )}
      {hasValidationWarning && !hasValidationError && (
        <Feedback
          id="feedback-warning"
          type="warning"
          data={warnings.map((warning) => warning.code)}
        />
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
            errorsAndWarnings={errorsAndWarnings}
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
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            defaultValue={sectionValues.voters_counts.proxy_certificate_count}
            format={format}
          />
          <InputGridRow
            key="C"
            field="C"
            id="voter_card_count"
            title="Kiezerspassen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.voters_counts.voter_card_count}
          />
          <InputGridRow
            key="D"
            field="D"
            id="total_admitted_voters_count"
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
            id="votes_candidates_counts"
            title="Stemmen op kandidaten"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.votes_candidates_counts}
          />
          <InputGridRow
            key="F"
            field="F"
            id="blank_votes_count"
            title="Blanco stemmen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.blank_votes_count}
          />
          <InputGridRow
            key="G"
            field="G"
            id="invalid_votes_count"
            title="Ongeldige stemmen"
            errorsAndWarnings={errorsAndWarnings}
            inputProps={register()}
            format={format}
            defaultValue={sectionValues.votes_counts.invalid_votes_count}
          />
          <InputGridRow
            key="H"
            field="H"
            id="total_votes_cast_count"
            title="Totaal uitgebrachte stemmen"
            errorsAndWarnings={errorsAndWarnings}
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
                errorsAndWarnings={errorsAndWarnings}
                inputProps={register()}
                format={format}
                defaultValue={sectionValues.voters_recounts?.poll_card_recount}
              />
              <InputGridRow
                key="B.2"
                field="B.2"
                id="proxy_certificate_recount"
                title="Volmachtbewijzen"
                errorsAndWarnings={errorsAndWarnings}
                inputProps={register()}
                defaultValue={sectionValues.voters_recounts?.proxy_certificate_recount}
                format={format}
              />
              <InputGridRow
                key="C.2"
                field="C.2"
                id="voter_card_recount"
                title="Kiezerspassen"
                errorsAndWarnings={errorsAndWarnings}
                inputProps={register()}
                format={format}
                defaultValue={sectionValues.voters_recounts?.voter_card_recount}
              />
              <InputGridRow
                key="D.2"
                field="D.2"
                id="total_admitted_voters_recount"
                title="Totaal toegelaten kiezers"
                errorsAndWarnings={errorsAndWarnings}
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
        <Button type="submit" size="lg" disabled={loading}>
          Volgende
        </Button>
        <span className="button_hint">SHIFT + Enter</span>
      </BottomBar>
    </form>
  );
}
