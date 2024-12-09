import * as React from "react";

import { CandidateVotes, getErrorsAndWarnings, PoliticalGroup, usePoliticalGroup } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
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
  useKeyboard,
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
  useKeyboard(formRef);

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

  const [missingTotalError, setMissingTotalError] = React.useState(false);
  const [warningsWarning, setWarningsWarning] = React.useState(false);

  const handleSubmit = (event: React.FormEvent<CandidatesVotesFormElement>) =>
    void (async (event: React.FormEvent<CandidatesVotesFormElement>) => {
      event.preventDefault();

      const values = getValues();
      if (values.candidate_votes.some((candidate) => candidate.votes > 0) && values.total === 0) {
        setMissingTotalError(true);
        document.getElementById("total")?.focus();
      } else if (errors.length === 0 && warnings.length > 0) {
        const acceptWarnings = acceptWarningsRef.current?.checked || false;
        setMissingTotalError(false);
        if (!hasChanges && !acceptWarnings) {
          setWarningsWarning(true);
        } else {
          await submit({ acceptWarnings });
        }
      } else {
        setMissingTotalError(false);
        await submit();
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
      title={`${t("list")} ${group.number} - ${group.name}`}
    >
      {isSaved && hasValidationError && (
        <Feedback id="feedback-error" type="error" data={errors.map((error) => error.code)} />
      )}
      {isSaved && hasValidationWarning && !hasValidationError && (
        <Feedback id="feedback-warning" type="warning" data={warnings.map((warning) => warning.code)} />
      )}
      <InputGrid key={`list${group.number}`} zebra>
        <InputGrid.Header>
          <th>{t("number")}</th>
          <th>{t("vote_count")}</th>
          <th>{t("candidate")}</th>
        </InputGrid.Header>
        <InputGrid.Body>
          {group.candidates.map((candidate, index) => {
            const addSeparator = (index + 1) % 25 === 0 && index + 1 !== group.candidates.length;
            const defaultValue = sectionValues?.candidate_votes[index]?.votes || "";
            const candidateFullName = candidate.first_name
              ? `${candidate.last_name}, ${candidate.initials} (${candidate.first_name})`
              : `${candidate.last_name}, ${candidate.initials}`;
            return (
              <InputGridRow
                autoFocusInput={index === 0}
                key={`list${group.number}-candidate${index + 1}`}
                field={`${index + 1}`}
                name="candidatevotes[]"
                id={`candidate_votes[${candidate.number - 1}].votes`}
                title={candidateFullName}
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
            title={t("totals_list", { group_number: group.number })}
            defaultValue={sectionValues?.total || ""}
            isListTotal
            {...defaultProps}
            errorMessageId={missingTotalError ? "missing-total-error" : undefined}
          />
        </InputGrid.Body>
      </InputGrid>
      {missingTotalError && (
        <div id="missing-total-error">
          <Alert type="error" variant="small">
            <p>{t("candidates_votes.check_totals")}</p>
          </Alert>
        </div>
      )}
      <BottomBar type="input-grid">
        {warningsWarning && (
          <BottomBar.Row>
            <Alert type="error" variant="small">
              <p>{t("candidates_votes.check_paper_report")}</p>
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
              label={t("candidates_votes.confirm_counts")}
            />
          </BottomBar.Row>
        )}
        <BottomBar.Row>
          <KeyboardKeys.HintText>
            <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Down]} />
            {t("candidates_votes.goto_totals")}
          </KeyboardKeys.HintText>
        </BottomBar.Row>
        <BottomBar.Row>
          <Button type="submit" size="lg" disabled={status.current === "saving"}>
            {t("next")}
          </Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </BottomBar.Row>
      </BottomBar>
    </Form>
  );
}
