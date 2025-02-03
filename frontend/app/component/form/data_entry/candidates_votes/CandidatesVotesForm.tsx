import { ErrorModal } from "app/component/error";

import { ApiError, PoliticalGroup } from "@kiesraad/api";
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
} from "@kiesraad/ui";

import { useCandidateVotes } from "./useCandidateVotes";

export interface CandidatesVotesFormProps {
  group: PoliticalGroup;
}

export function CandidatesVotesForm({ group }: CandidatesVotesFormProps) {
  const { error, formRef, onSubmit, currentValues, setValues, formSection, status, setAcceptWarnings, defaultProps } =
    useCandidateVotes(group.number);

  const showAcceptWarnings = formSection.warnings.length > 0 && formSection.errors.length === 0;

  const missingTotalError = currentValues.candidate_votes.some((v) => v !== "") && currentValues.total === 0;

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
      ref={formRef}
      id={`candidates_form_${group.number}`}
      title={`${t("list")} ${group.number} - ${group.name}`}
    >
      {error instanceof ApiError && <ErrorModal error={error} />}
      {/* <PollingStationFormNavigation
        onSubmit={onSubmit}
        currentValues={formValuesToValues(currentValues)}
      /> */}
      {formSection.isSaved && formSection.errors.length > 0 && (
        <Feedback id="feedback-error" type="error" data={formSection.errors.map((error) => error.code)} />
      )}
      {formSection.isSaved && formSection.warnings.length > 0 && formSection.errors.length === 0 && (
        <Feedback id="feedback-warning" type="warning" data={formSection.warnings.map((warning) => warning.code)} />
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
            const defaultValue = currentValues?.candidate_votes[index] || "";
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
                value={defaultValue}
                onChange={(e) => {
                  const newValues = [...currentValues.candidate_votes];
                  newValues[index] = e.target.value;
                  setValues({
                    ...currentValues,
                    candidate_votes: newValues,
                  });
                }}
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
            value={currentValues.total}
            onChange={(e) => {
              setValues({
                ...currentValues,
                total: parseInt(e.target.value, 10),
              });
            }}
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
        {formSection.acceptWarningsError && (
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
              checked={formSection.acceptWarnings}
              hasError={formSection.acceptWarningsError}
              onChange={(e) => setAcceptWarnings(e.target.checked)}
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
          <Button type="submit" size="lg" disabled={status === "saving"}>
            {t("next")}
          </Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </BottomBar.Row>
      </BottomBar>
    </Form>
  );
}
