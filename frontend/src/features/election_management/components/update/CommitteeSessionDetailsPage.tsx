import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { AnyApiError, ApiError, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { Footer } from "@/components/footer/Footer";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";
import { COMMITTEE_SESSION_UPDATE_REQUEST_PATH, CommitteeSessionUpdateRequest } from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";
import { convertNLDateToISODate, isValidNLDate, isValidTime } from "@/utils/dateTime";

import cls from "../ElectionManagement.module.css";

type ValidationErrors = {
  location?: string;
  start_date?: string;
  start_time?: string;
};

export function CommitteeSessionDetailsPage() {
  const client = useApiClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCommitteeSession, election, refetch } = useElection();
  const [submitError, setSubmitError] = useState<AnyApiError | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const redirectToReportPage = location.hash === "#redirect-to-report";
  const sessionLabel = committeeSessionLabel(currentCommitteeSession.number, true).toLowerCase();
  const defaultDate = currentCommitteeSession.start_date_time
    ? new Date(currentCommitteeSession.start_date_time).toLocaleDateString(t("date_locale"), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";
  const defaultTime = currentCommitteeSession.start_date_time
    ? new Date(currentCommitteeSession.start_date_time).toLocaleTimeString(t("date_locale"), {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (submitError) {
    throw submitError;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const locationValue = formData.get("location");
    const startDateValue = formData.get("start_date");
    const startTimeValue = formData.get("start_time");

    const location = (typeof locationValue === "string" ? locationValue : "").trim();
    const start_date = (typeof startDateValue === "string" ? startDateValue : "").trim();
    const start_time = (typeof startTimeValue === "string" ? startTimeValue : "").trim();

    if (!validate(location, start_date, start_time)) {
      return;
    }

    const details: CommitteeSessionUpdateRequest = {
      location,
      start_date: convertNLDateToISODate(start_date),
      start_time,
    };

    const path: COMMITTEE_SESSION_UPDATE_REQUEST_PATH = `/api/committee_sessions/${currentCommitteeSession.id}`;
    client
      .putRequest(path, details)
      .then(async (result) => {
        if (isSuccess(result)) {
          if (redirectToReportPage) {
            await refetch();
            void navigate(`/elections/${election.id}/report/committee-session/${currentCommitteeSession.id}/download`);
          } else {
            void navigate("..");
          }
        } else if (result instanceof ApiError && result.reference === "InvalidData") {
          setErrorAlert(t(`error.api_error.${result.reference}`));
        } else {
          throw result;
        }
      })
      .catch(setSubmitError);
  }

  function validate(location: string, start_date: string, start_time: string) {
    const errors: ValidationErrors = {};

    if (location.length === 0) {
      errors.location = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
    }

    if (start_date.length === 0) {
      errors.start_date = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
    } else if (!isValidNLDate(start_date)) {
      errors.start_date = t("election_management.date_error");
    }

    if (start_time.length === 0) {
      errors.start_time = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
    } else if (!isValidTime(start_time)) {
      errors.start_time = t("election_management.time_error");
    }

    const isValid = Object.keys(errors).length === 0;
    setValidationErrors(isValid ? null : errors);
    return isValid;
  }

  return (
    <>
      <header>
        <section>
          <h1>
            {/* TODO: Change to conditional GSB/HSB/CSB when implemented */}
            {t("GSB")} {election.location}
          </h1>
        </section>
      </header>
      <main>
        <article>
          {errorAlert && (
            <FormLayout.Alert>
              <Alert type="error">
                <strong className="heading-md">{errorAlert}</strong>
              </Alert>
            </FormLayout.Alert>
          )}
          <Form
            title={t("election_management.custom_committee_session_details", {
              sessionLabel: sessionLabel,
            })}
            className={cls.detailsForm}
            onSubmit={handleSubmit}
          >
            <FormLayout>
              <FormLayout.Section>
                <InputField
                  id="location"
                  name="location"
                  label={t("election_management.session_location")}
                  hint={tx("election_management.add_the_location")}
                  fieldWidth="wide"
                  error={validationErrors?.location}
                  defaultValue={currentCommitteeSession.location || ""}
                />
              </FormLayout.Section>
              <FormLayout.Section title={t("election_management.session_start")}>
                <FormLayout.Row>
                  <InputField
                    id="start_date"
                    name="start_date"
                    label={t("election_management.date")}
                    hint={t("election_management.date_hint")}
                    fieldWidth="average"
                    error={validationErrors?.start_date}
                    defaultValue={defaultDate}
                    placeholder="dd-mm-jjjj"
                  />
                  <InputField
                    id="start_time"
                    name="start_time"
                    label={t("election_management.time")}
                    hint={t("election_management.time_hint")}
                    fieldWidth="narrowish"
                    error={validationErrors?.start_time}
                    defaultValue={defaultTime}
                    placeholder="uu:mm"
                  />
                </FormLayout.Row>
              </FormLayout.Section>
              <FormLayout.Controls>
                <Button type="submit">
                  {redirectToReportPage ? t("election_management.to_report") : t("save_changes")}
                </Button>
                <Button.Link variant="secondary" size="lg" to="..">
                  {t("cancel")}
                </Button.Link>
              </FormLayout.Controls>
            </FormLayout>
          </Form>
        </article>
      </main>
      <Footer />
    </>
  );
}
