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
  const { committeeSession, election, refetch } = useElection();
  const [submitError, setSubmitError] = useState<AnyApiError | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const redirectToReportPage = location.hash === "#redirect-to-report";
  const sessionLabel = committeeSessionLabel(committeeSession.number, true).toLowerCase();
  const defaultDate = committeeSession.start_date
    ? new Date(committeeSession.start_date).toLocaleDateString(t("date_locale"), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  if (submitError) {
    throw submitError;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const details: CommitteeSessionUpdateRequest = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      location: (formData.get("location") as string).trim(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      start_date: (formData.get("start_date") as string).trim(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      start_time: (formData.get("start_time") as string).trim(),
    };

    if (!validate(details)) {
      return;
    }

    details.start_date = convertNLDateToISODate(details.start_date);

    const path: COMMITTEE_SESSION_UPDATE_REQUEST_PATH = `/api/committee_sessions/${committeeSession.id}`;
    client
      .putRequest(path, details)
      .then(async (result) => {
        if (isSuccess(result)) {
          if (redirectToReportPage) {
            await refetch();
            void navigate(`/elections/${election.id}/report/download`);
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

  function validate(detailsUpdate: CommitteeSessionUpdateRequest) {
    const errors: ValidationErrors = {};

    if (detailsUpdate.location.length === 0) {
      errors.location = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
    }

    if (detailsUpdate.start_date.length === 0) {
      errors.start_date = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
    } else if (!isValidNLDate(detailsUpdate.start_date)) {
      errors.start_date = t("election_management.date_error");
    }

    if (detailsUpdate.start_time.length === 0) {
      errors.start_time = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
    } else if (!isValidTime(detailsUpdate.start_time)) {
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
            {t("election_management.custom_committee_session_details", {
              sessionLabel: sessionLabel,
            })}
          </h1>
        </section>
      </header>
      <main>
        <article>
          <Form className={cls.detailsForm} onSubmit={handleSubmit}>
            {errorAlert && (
              <FormLayout.Alert>
                <Alert type="error">{errorAlert}</Alert>
              </FormLayout.Alert>
            )}
            <FormLayout>
              <h2>{t("election_management.where_is_the_committee_session", { sessionLabel: sessionLabel })}</h2>
              <InputField
                id="location"
                name="location"
                label={t("election_management.session_location")}
                hint={tx("election_management.add_the_location")}
                fieldWidth="wide"
                error={validationErrors?.location}
                defaultValue={committeeSession.location || ""}
              />
              <h2>
                {t("election_management.when_is_the_committee_session", {
                  verb:
                    committeeSession.status === "created" || committeeSession.status === "data_entry_not_started"
                      ? t("election_management.starts")
                      : t("election_management.started"),
                  sessionLabel: sessionLabel,
                })}
              </h2>
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
                  defaultValue={committeeSession.start_time || ""}
                  placeholder="uu:mm"
                />
              </FormLayout.Row>
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
