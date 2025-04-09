import { ApiError } from "@/api";
import { ErrorModal } from "@/components/error";
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
} from "@/components/ui";
import { t } from "@/lib/i18n";

import { DataEntryNavigation } from "../DataEntryNavigation";
import { useVotersAndVotes } from "./useVotersAndVotes";
import { formValuesToValues } from "./votersAndVotesValues";

export function VotersAndVotesForm() {
  const {
    error,
    formRef,
    onSubmit,
    pollingStationResults,
    currentValues,
    setValues,
    formSection,
    status,
    setAcceptWarnings,
    defaultProps,
    showAcceptWarnings,
  } = useVotersAndVotes();

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
      <DataEntryNavigation
        onSubmit={onSubmit}
        currentValues={formValuesToValues(currentValues, pollingStationResults.recounted || false)}
      />
      {error instanceof ApiError && <ErrorModal error={error} />}
      {formSection.isSaved && !formSection.errors.isEmpty() && (
        <Feedback id="feedback-error" type="error" data={formSection.errors.getCodes()} />
      )}
      {formSection.isSaved && !formSection.warnings.isEmpty() && formSection.errors.isEmpty() && (
        <Feedback id="feedback-warning" type="warning" data={formSection.warnings.getCodes()} />
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
            id="data.voters_counts.poll_card_count"
            title={t("voters_and_votes.poll_card_count")}
            value={currentValues.poll_card_count || ""}
            onChange={(e) => {
              setValues({
                ...currentValues,
                poll_card_count: e.target.value,
              });
            }}
            {...defaultProps}
          />
          <InputGridRow
            key="B"
            field="B"
            id="data.voters_counts.proxy_certificate_count"
            title={t("voters_and_votes.proxy_certificate_count")}
            value={currentValues.proxy_certificate_count || ""}
            onChange={(e) => {
              setValues({
                ...currentValues,
                proxy_certificate_count: e.target.value,
              });
            }}
            {...defaultProps}
          />
          <InputGridRow
            key="C"
            field="C"
            id="data.voters_counts.voter_card_count"
            title={t("voters_and_votes.voter_card_count")}
            value={currentValues.voter_card_count || ""}
            onChange={(e) => {
              setValues({
                ...currentValues,
                voter_card_count: e.target.value,
              });
            }}
            {...defaultProps}
          />
          <InputGridRow
            key="D"
            field="D"
            id="data.voters_counts.total_admitted_voters_count"
            title={t("voters_and_votes.total_admitted_voters_count")}
            isTotal
            addSeparator
            value={currentValues.total_admitted_voters_count || ""}
            onChange={(e) => {
              setValues({
                ...currentValues,
                total_admitted_voters_count: e.target.value,
              });
            }}
            {...defaultProps}
          />
          <InputGridRow
            key="E"
            field="E"
            id="data.votes_counts.votes_candidates_count"
            title={t("voters_and_votes.votes_candidates_count")}
            value={currentValues.votes_candidates_count || ""}
            onChange={(e) => {
              setValues({
                ...currentValues,
                votes_candidates_count: e.target.value,
              });
            }}
            {...defaultProps}
          />
          <InputGridRow
            key="F"
            field="F"
            id="data.votes_counts.blank_votes_count"
            title={t("voters_and_votes.blank_votes_count")}
            value={currentValues.blank_votes_count || ""}
            onChange={(e) => {
              setValues({
                ...currentValues,
                blank_votes_count: e.target.value,
              });
            }}
            {...defaultProps}
          />
          <InputGridRow
            key="G"
            field="G"
            id="data.votes_counts.invalid_votes_count"
            title={t("voters_and_votes.invalid_votes_count")}
            value={currentValues.invalid_votes_count || ""}
            onChange={(e) => {
              setValues({
                ...currentValues,
                invalid_votes_count: e.target.value,
              });
            }}
            {...defaultProps}
          />
          <InputGridRow
            key="H"
            field="H"
            id="data.votes_counts.total_votes_cast_count"
            title={t("voters_and_votes.total_votes_cast_count")}
            value={currentValues.total_votes_cast_count || ""}
            onChange={(e) => {
              setValues({
                ...currentValues,
                total_votes_cast_count: e.target.value,
              });
            }}
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
                id="data.voters_recounts.poll_card_count"
                title={t("voters_and_votes.poll_card_recount")}
                value={currentValues.poll_card_recount || ""}
                onChange={(e) => {
                  setValues({
                    ...currentValues,
                    poll_card_recount: e.target.value,
                  });
                }}
                {...defaultProps}
              />
              <InputGridRow
                key="B.2"
                field="B.2"
                id="data.voters_recounts.proxy_certificate_count"
                title={t("voters_and_votes.proxy_certificate_recount")}
                value={currentValues.proxy_certificate_recount || ""}
                onChange={(e) => {
                  setValues({
                    ...currentValues,
                    proxy_certificate_recount: e.target.value,
                  });
                }}
                {...defaultProps}
              />
              <InputGridRow
                key="C.2"
                field="C.2"
                id="data.voters_recounts.voter_card_count"
                title={t("voters_and_votes.voter_card_recount")}
                value={currentValues.voter_card_recount || ""}
                onChange={(e) => {
                  setValues({
                    ...currentValues,
                    voter_card_recount: e.target.value,
                  });
                }}
                {...defaultProps}
              />
              <InputGridRow
                key="D.2"
                field="D.2"
                id="data.voters_recounts.total_admitted_voters_count"
                title={t("voters_and_votes.total_admitted_voters_recount")}
                value={currentValues.total_admitted_voters_recount || ""}
                onChange={(e) => {
                  setValues({
                    ...currentValues,
                    total_admitted_voters_recount: e.target.value,
                  });
                }}
                isTotal
                {...defaultProps}
              />
            </InputGrid.Body>
          </>
        )}
      </InputGrid>
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
              id="voters_and_votes_form_accept_warnings"
              checked={formSection.acceptWarnings}
              hasError={formSection.acceptWarningsError}
              onChange={(e) => {
                setAcceptWarnings(e.target.checked);
              }}
              label={t("voters_and_votes.form_accept_warnings")}
            />
          </BottomBar.Row>
        )}
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
