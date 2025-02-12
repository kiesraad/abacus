import { ErrorModal } from "app/component/error";

import { ApiError } from "@kiesraad/api";
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
      {formSection.isSaved && formSection.errors.length > 0 && (
        <Feedback id="feedback-error" type="error" data={formSection.errors.map((error) => error.code)} />
      )}
      {formSection.isSaved && formSection.warnings.length > 0 && formSection.errors.length === 0 && (
        <Feedback id="feedback-warning" type="warning" data={formSection.warnings.map((warning) => warning.code)} />
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
            id="proxy_certificate_count"
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
            id="voter_card_count"
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
            id="total_admitted_voters_count"
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
            id="votes_candidates_count"
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
            id="blank_votes_count"
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
            id="invalid_votes_count"
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
            id="total_votes_cast_count"
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
                id="poll_card_recount"
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
                id="proxy_certificate_recount"
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
                id="voter_card_recount"
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
                id="total_admitted_voters_recount"
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
      <BottomBar type="input-grid">
        {formSection.acceptWarningsError && (
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
