import { PollingStationFormNavigation } from "app/component/pollingstation/PollingStationFormNavigation";

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

import { useVotersAndVotes } from "./useVotersAndVotes";
import { formValuesToValues } from "./votersAndVotesValues";

export function VotersAndVotesForm() {
  const {
    formRef,
    onSubmit,
    pollingStationResults,
    currentValues,
    setCurrentValues,
    errors,
    hasValidationError,
    warnings,
    hasValidationWarning,
    isSaving,
    isSaved,
    hasChanges,
    acceptWarnings,
    setAcceptWarnings,
    showAcceptWarnings,
    warningsWarning,
    defaultProps,
  } = useVotersAndVotes();

  console.log('upper checked', acceptWarnings);

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
      ref={formRef}
      id="voters_and_votes_form"
      title={t("voters_and_votes.form_title")}
    >
      <PollingStationFormNavigation
        onSubmit={onSubmit}
        currentValues={formValuesToValues(currentValues, pollingStationResults.recounted || false)}
        hasChanges={hasChanges}
        acceptWarnings={acceptWarnings}
      />
      {isSaved && hasValidationError && (
        <Feedback id="feedback-error" type="error" data={errors.map((error) => error.code)} />
      )}
      {isSaved && hasValidationWarning && !hasValidationError && (
        <Feedback id="feedback-warning" type="warning" data={warnings.map((warning) => warning.code)} />
      )}
      <InputGrid key="voters-and-votes">
        <InputGrid.Header>
          <th>{t("field")}</th>
          <th>{t("counted_number")}</th>
          <th>{t("description")}</th>
        </InputGrid.Header>
        <InputGrid.Body>
          <InputGridRow
            autoFocusInput
            key="A"
            field="A"
            id="poll_card_count"
            title={t("voters_and_votes.poll_card_count")}
            value={currentValues.poll_card_count || ''}
            onChange={(e) =>
              setCurrentValues({
                ...currentValues,
                poll_card_count: e.target.value,
              })
            }
            {...defaultProps}
          />
          <InputGridRow
            key="B"
            field="B"
            id="proxy_certificate_count"
            title={t("voters_and_votes.proxy_certificate_count")}
            value={currentValues.proxy_certificate_count || ''}
            onChange={(e) =>
              setCurrentValues({
                ...currentValues,
                proxy_certificate_count: e.target.value,
              })
            }
            {...defaultProps}
          />
          <InputGridRow
            key="C"
            field="C"
            id="voter_card_count"
            title={t("voters_and_votes.voter_card_count")}
            value={currentValues.voter_card_count || ''}
            onChange={(e) =>
              setCurrentValues({
                ...currentValues,
                voter_card_count: e.target.value,
              })
            }
            {...defaultProps}
          />
          <InputGridRow
            key="D"
            field="D"
            id="total_admitted_voters_count"
            title={t("voters_and_votes.total_admitted_voters_count")}
            isTotal
            addSeparator
            value={currentValues.total_admitted_voters_count || ''}
            onChange={(e) =>
              setCurrentValues({
                ...currentValues,
                total_admitted_voters_count: e.target.value,
              })
            }
            {...defaultProps}
          />
          <InputGridRow
            key="E"
            field="E"
            id="votes_candidates_count"
            title={t("voters_and_votes.votes_candidates_count")}
            value={currentValues.votes_candidates_count || ''}
            onChange={(e) =>
              setCurrentValues({
                ...currentValues,
                votes_candidates_count: e.target.value,
              })
            }
            {...defaultProps}
          />
          <InputGridRow
            key="F"
            field="F"
            id="blank_votes_count"
            title={t("voters_and_votes.blank_votes_count")}
            value={currentValues.blank_votes_count || ''}
            onChange={(e) =>
              setCurrentValues({
                ...currentValues,
                blank_votes_count: e.target.value,
              })
            }
            {...defaultProps}
          />
          <InputGridRow
            key="G"
            field="G"
            id="invalid_votes_count"
            title={t("voters_and_votes.invalid_votes_count")}
            value={currentValues.invalid_votes_count || ''}
            onChange={(e) =>
              setCurrentValues({
                ...currentValues,
                invalid_votes_count: e.target.value,
              })
            }
            {...defaultProps}
          />
          <InputGridRow
            key="H"
            field="H"
            id="total_votes_cast_count"
            title={t("voters_and_votes.total_votes_cast_count")}
            value={currentValues.total_votes_cast_count || ''}
            onChange={(e) =>
              setCurrentValues({
                ...currentValues,
                total_votes_cast_count: e.target.value,
              })
            }
            isTotal
            {...defaultProps}
          />
        </InputGrid.Body>
        {pollingStationResults.recounted && (
          <>
            <InputGrid.SectionTitleHeader>
              <h2 className="mt-lg">{t("voters_and_votes.admitted_voters_after_recount")}</h2>
              <th>{t("field")}</th>
              <th>{t("counted_number")}</th>
              <th>{t("description")}</th>
            </InputGrid.SectionTitleHeader>
            <InputGrid.Body>
              <InputGridRow
                key="A.2"
                field="A.2"
                id="poll_card_recount"
                title={t("voters_and_votes.poll_card_recount")}
                value={currentValues.poll_card_recount || ''}
                onChange={(e) =>
                  setCurrentValues({
                    ...currentValues,
                    poll_card_recount: e.target.value,
                  })
                }
                {...defaultProps}
              />
              <InputGridRow
                key="B.2"
                field="B.2"
                id="proxy_certificate_recount"
                title={t("voters_and_votes.proxy_certificate_recount")}
                value={currentValues.proxy_certificate_recount || ''}
                onChange={(e) =>
                  setCurrentValues({
                    ...currentValues,
                    proxy_certificate_recount: e.target.value,
                  })
                }
                {...defaultProps}
              />
              <InputGridRow
                key="C.2"
                field="C.2"
                id="voter_card_recount"
                title={t("voters_and_votes.voter_card_recount")}
                value={currentValues.voter_card_recount || ''}
                onChange={(e) =>
                  setCurrentValues({
                    ...currentValues,
                    voter_card_recount: e.target.value,
                  })
                }
                {...defaultProps}
              />
              <InputGridRow
                key="D.2"
                field="D.2"
                id="total_admitted_voters_recount"
                title={t("voters_and_votes.total_admitted_voters_recount")}
                value={currentValues.total_admitted_voters_recount || ''}
                onChange={(e) =>
                  setCurrentValues({
                    ...currentValues,
                    total_admitted_voters_recount: e.target.value,
                  })
                }
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
              <p>{t("voters_and_votes.continue_after_check")}</p>
            </Alert>
          </BottomBar.Row>
        )}
        {showAcceptWarnings && (
          <BottomBar.Row>
            <Checkbox
              id="voters_and_votes_form_accept_warnings"
              checked={acceptWarnings}
              hasError={warningsWarning}
              onChange={(e) => setAcceptWarnings(e.target.checked)}
              label={t("voters_and_votes.form_accept_warnings")}
            />
          </BottomBar.Row>
        )}
        <BottomBar.Row>
          <Button type="submit" size="lg" disabled={isSaving}>
            {t("next")}
          </Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </BottomBar.Row>
      </BottomBar>
    </Form>
  );
}
