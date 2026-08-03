import type { SubmitEvent } from "react";
import { Navigate, useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t } from "@/i18n/translate";
import { StringFormData } from "@/utils/stringFormData";
import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function CountingMethodType() {
  const { state, dispatch } = useElectionCreateContext();
  const navigate = useNavigate();

  // if no election data was stored, navigate back to beginning
  if (!state.election) {
    return <Navigate to="/elections/create" />;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new StringFormData(event.currentTarget);
    const countingMethod = formData.getString("counting_method");
    if (!countingMethod || (countingMethod !== "CSO" && countingMethod !== "DSO")) {
      return;
    }

    dispatch({
      type: "SET_COUNTING_METHOD_TYPE",
      countingMethod,
    });
    await navigate("/elections/create/number-of-voters");
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
              <ChoiceList.Radio
                id="cso"
                name={"counting_method"}
                label={t("election.voting_method_type.cso")}
                defaultValue={"CSO"}
                defaultChecked={state.countingMethod === "CSO" || !state.countingMethod}
              >
                {t("election.voting_method_type.cso_description")}
              </ChoiceList.Radio>
              <ChoiceList.Radio
                id="dso"
                name={"counting_method"}
                label={t("election.voting_method_type.dso")}
                defaultValue={"DSO"}
                defaultChecked={state.countingMethod === "DSO"}
              >
                {t("election.voting_method_type.dso_description")}
              </ChoiceList.Radio>
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
