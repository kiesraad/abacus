import { type SubmitEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t } from "@/i18n/translate";
import { voteCountingMethodValues } from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";
import { isOneOf } from "@/utils/typeChecks";
import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function CountingMethodType() {
  const { state, dispatch } = useElectionCreateContext();
  const [error, setError] = useState<string | undefined>();
  const navigate = useNavigate();

  // if no election data was stored, navigate back to beginning
  if (!state.election) {
    return <Navigate to="/elections/create" />;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new StringFormData(event.currentTarget);
    const countingMethod = formData.getString("counting_method");

    if (isOneOf(voteCountingMethodValues, countingMethod)) {
      dispatch({
        type: "SET_COUNTING_METHOD_TYPE",
        countingMethod,
      });
      await navigate("/elections/create/number-of-voters");
    } else {
      setError(t("mandatory_question"));
    }
  }

  return (
    <section className="md">
      <Form
        title={`${t("election.voting_method_type.title")} ${state.election.location}`}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <FormLayout>
          <FormLayout.Section>
            <p>
              {t("election.voting_method_type.description", {
                election: state.election.name,
                location: state.election.location,
              })}
            </p>

            <ChoiceList>
              {error && <ChoiceList.Error id="choicelist-error">{error}</ChoiceList.Error>}
              {voteCountingMethodValues.map((countingMethod) => {
                return (
                  <ChoiceList.Radio
                    id={countingMethod}
                    key={countingMethod}
                    name={"counting_method"}
                    label={t(`election.voting_method_type.${countingMethod}`)}
                    defaultValue={countingMethod}
                    defaultChecked={state.countingMethod === countingMethod}
                  >
                    {t(`election.voting_method_type.${countingMethod}_description`)}
                  </ChoiceList.Radio>
                );
              })}
            </ChoiceList>
          </FormLayout.Section>

          <FormLayout.Controls>
            <Button type="submit">{t("next")}</Button>
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    </section>
  );
}
