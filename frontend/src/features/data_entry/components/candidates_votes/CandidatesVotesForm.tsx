import * as React from "react";

import { ApiError } from "@/api/ApiResult";
import { PoliticalGroup } from "@/api/gen/openapi";
import { ErrorModal } from "@/components/error/ErrorModal";
import { Alert } from "@/components/ui/Alert/Alert";
import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/CheckboxAndRadio/CheckboxAndRadio";
import { Feedback } from "@/components/ui/Feedback/Feedback";
import { Form } from "@/components/ui/Form/Form";
import { InputGrid } from "@/components/ui/InputGrid/InputGrid";
import { InputGridRow } from "@/components/ui/InputGrid/InputGridRow";
import { KeyboardKeys } from "@/components/ui/KeyboardKeys/KeyboardKeys";
import { t } from "@/lib/i18n";
import { getCandidateFullName } from "@/lib/util/candidate";
import { KeyboardKey } from "@/types/ui";

import { DataEntryNavigation } from "../DataEntryNavigation";
import { formValuesToValues } from "./candidatesVotesValues";
import { useCandidateVotes } from "./useCandidateVotes";

export interface CandidatesVotesFormProps {
  group: PoliticalGroup;
}

export function CandidatesVotesForm({ group }: CandidatesVotesFormProps) {
  const {
    error,
    formRef,
    onSubmit,
    currentValues,
    setValues,
    formSection,
    status,
    setAcceptWarnings,
    defaultProps,
    pollingStationResults,
    missingTotalError,
    showAcceptWarnings,
  } = useCandidateVotes(group.number);

  const totalFieldId = `data.political_group_votes[${group.number - 1}].total`;

  React.useEffect(() => {
    if (missingTotalError) {
      document.getElementById(totalFieldId)?.focus();
    }
  }, [missingTotalError, totalFieldId]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void onSubmit();
  };

  return (
    <Form
      onSubmit={handleSubmit}
      ref={formRef}
      id={`candidates_form_${group.number}`}
      title={`${t("list")} ${group.number} - ${group.name}`}
    >
      {error instanceof ApiError && <ErrorModal error={error} />}
      <DataEntryNavigation
        onSubmit={onSubmit}
        currentValues={{
          political_group_votes: pollingStationResults.political_group_votes.map((pg) =>
            pg.number !== group.number ? pg : formValuesToValues(currentValues),
          ),
        }}
      />
      {formSection.isSaved && !formSection.errors.isEmpty() && (
        <Feedback id="feedback-error" type="error" data={formSection.errors.getCodes()} />
      )}
      {formSection.isSaved && !formSection.warnings.isEmpty() && formSection.errors.isEmpty() && (
        <Feedback id="feedback-warning" type="warning" data={formSection.warnings.getCodes()} />
      )}
      <InputGrid key={`list${group.number}`} zebra>
        <InputGrid.Header>
          <th>{t("number")}</th>
          <th>{t("vote_count")}</th>
          <th>{t("candidate.title")}</th>
        </InputGrid.Header>
        <InputGrid.Body>
          {group.candidates.map((candidate, index) => {
            const addSeparator = (index + 1) % 25 === 0 && index + 1 !== group.candidates.length;
            const defaultValue = currentValues.candidate_votes[index] || "";
            const candidateFullName = getCandidateFullName(candidate);

            return (
              <InputGridRow
                autoFocusInput={index === 0}
                key={`list${group.number}-candidate${index + 1}`}
                field={`${index + 1}`}
                name="candidatevotes[]"
                id={`data.political_group_votes[${group.number - 1}].candidate_votes[${candidate.number - 1}].votes`}
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
            id={totalFieldId}
            title={t("totals_list", { group_number: group.number })}
            value={currentValues.total}
            onChange={(e) => {
              setValues({
                ...currentValues,
                total: e.target.value,
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
      <BottomBar type="inputGrid">
        {formSection.acceptWarningsError && (
          <BottomBar.Row>
            <Alert type="error" variant="small">
              <p>{t("data_entry.continue_after_check")}</p>
            </Alert>
          </BottomBar.Row>
        )}
        {showAcceptWarnings && (
          <BottomBar.Row>
            <Checkbox
              id={`candidates_votes_form_accept_warnings_${group.number}`}
              checked={formSection.acceptWarnings}
              hasError={formSection.acceptWarningsError}
              onChange={(e) => {
                setAcceptWarnings(e.target.checked);
              }}
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
