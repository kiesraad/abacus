/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { AnyApiError, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { Footer } from "@/components/footer/Footer";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";
import {
  COMMITTEE_SESSION_UPDATE_REQUEST_BODY,
  COMMITTEE_SESSION_UPDATE_REQUEST_PATH,
} from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";

import cls from "./ElectionManagement.module.css";

export function CommitteeSessionDetailsPage() {
  const client = useApiClient();
  const navigate = useNavigate();
  const { committeeSession } = useElection();
  const [submitError, setSubmitError] = useState<AnyApiError | null>(null);
  const sessionLabel = committeeSessionLabel(committeeSession.number, true).toLowerCase();

  if (submitError) {
    throw submitError;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // Convert date from dd-mm-yyyy to yyyy-mm-dd
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const dateParts = /(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[12])-(20\d{2})/.exec(formData.get("startDate") as string);
    const dateString = `${dateParts?.[3]}-${dateParts?.[2]}-${dateParts?.[1]}`;

    const path: COMMITTEE_SESSION_UPDATE_REQUEST_PATH = `/api/committee_sessions/${committeeSession.id}`;
    const body: COMMITTEE_SESSION_UPDATE_REQUEST_BODY = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      location: (formData.get("location") as string).trim(),
      start_date: dateString,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      start_time: (formData.get("startTime") as string).trim(),
    };
    client
      .putRequest(path, body)
      .then((result) => {
        if (isSuccess(result)) {
          void navigate("..");
        } else {
          throw result;
        }
      })
      .catch(setSubmitError);
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
            <FormLayout width="medium">
              <h2>{t("election_management.where_is_the_committee_session")}</h2>
              <InputField
                id="location"
                name="location"
                label={t("election_management.session_location")}
                hint={tx("election_management.add_the_location")}
                fieldWidth="wide"
                defaultValue={committeeSession.location}
                required
              />
              <h2>{t("election_management.when_is_the_committee_session", { sessionLabel: sessionLabel })}</h2>
              <FormLayout.Row>
                <InputField
                  id="startDate"
                  name="startDate"
                  label={t("election_management.date")}
                  hint={t("election_management.date_hint")}
                  fieldWidth="average"
                  defaultValue={new Date(committeeSession.start_date).toLocaleDateString(t("date_locale"), {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                  placeholder="dd-mm-jjjj"
                  pattern="(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[12])-(20\d{2})"
                  onInvalid={(e) => {
                    e.currentTarget.setCustomValidity("Vul de datum in met het format: dd-mm-jjjj");
                  }}
                  onInput={(e) => {
                    e.currentTarget.setCustomValidity("");
                    return !e.currentTarget.validity.valid && e.currentTarget.setCustomValidity(" ");
                  }}
                  required
                />
                <InputField
                  id="startTime"
                  name="startTime"
                  label={t("election_management.time")}
                  hint={t("election_management.time_hint")}
                  fieldWidth="narrowish"
                  defaultValue={committeeSession.start_time}
                  placeholder="uu:mm"
                  pattern="([01][0-9]|2[0-3]):([0-5][0-9])"
                  onInvalid={(e) => {
                    e.currentTarget.setCustomValidity("Vul de tijd in met het format: uu:mm");
                  }}
                  onInput={(e) => {
                    e.currentTarget.setCustomValidity("");
                    return !e.currentTarget.validity.valid && e.currentTarget.setCustomValidity(" ");
                  }}
                  required
                />
              </FormLayout.Row>
              <FormLayout.Controls>
                <Button size="lg" type="submit">
                  {t("save_changes")}
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
