import * as React from "react";

import { getErrorsAndWarnings, useVotersAndVotes, VotersAndVotesValues } from "@kiesraad/api";
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

interface IgnoreWarningsCheckboxProps {
  id: string;
  children: React.ReactNode;
  defaultChecked?: boolean;
  hidden?: boolean;
}

function IgnoreWarningsCheckbox({
  id,
  children,
  defaultChecked,
  hidden,
}: IgnoreWarningsCheckboxProps) {
  return (
    <div style={{ display: hidden ? "none" : "block" }}>
      <input type="checkbox" id={id} defaultChecked={defaultChecked} />
      <label htmlFor="voters_and_votes_form_ignore_warnings">{children}</label>
    </div>
  );
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
  const [hideIgnoreWarnings, setHideIgnoreWarnings] = React.useState(false);
  const getValues = React.useCallback(() => {
    const form = document.getElementById("voters_and_votes_form") as HTMLFormElement;
    const elements = form.elements as VotersAndVotesFormElement["elements"];
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
    const recountForm = document.getElementById("voters_and_votes_recount_section");
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

  const { sectionValues, loading, errors, warnings, isSaved, ignoreWarnings, submit, recounted } =
    useVotersAndVotes(getValues);

  useTooltip({
    onDismiss: resetWarnings,
  });

  function handleSubmit(event: React.FormEvent<VotersAndVotesFormElement>) {
    event.preventDefault();
    const ignoreWarnings = (
      document.getElementById("voters_and_votes_form_ignore_warnings") as HTMLInputElement
    ).checked;
    submit(ignoreWarnings);
  }

  const errorsAndWarnings = getErrorsAndWarnings(errors, warnings, inputMaskWarnings);

  React.useEffect(() => {
    const onKeyUp = () => {
      setHideIgnoreWarnings(true);
      document.removeEventListener("keyup", onKeyUp);
    };

    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keyup", onKeyUp);
    };
  });

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
      </InputGrid>
      {recounted && (
        <div id="voters_and_votes_recount_section">
          <h2 id="recounted_title">
            Toegelaten kiezers na hertelling door gemeentelijk stembureau
          </h2>
          <InputGrid key="recounted">
            <InputGrid.Header>
              <th>Veld</th>
              <th>Geteld aantal</th>
              <th>Omschrijving</th>
            </InputGrid.Header>
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
          </InputGrid>
        </div>
      )}
      <BottomBar type="inputgrid">
        <IgnoreWarningsCheckbox
          id="voters_and_votes_form_ignore_warnings"
          defaultChecked={ignoreWarnings}
          hidden={hideIgnoreWarnings || warnings.length === 0}
        >
          Ik heb de aantallen gecontroleerd met papier en correct overgenomen.
        </IgnoreWarningsCheckbox>
        <Button type="submit" size="lg" disabled={loading}>
          Volgende
        </Button>
        <span className="button_hint">SHIFT + Enter</span>
      </BottomBar>
    </form>
  );
}
