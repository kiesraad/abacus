import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t } from "@/i18n/translate";
import type { ElectionCategory } from "@/types/generated/openapi.ts";
import { StringFormData } from "@/utils/stringFormData.ts";
import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function PollingStationRole() {
  const { state, dispatch } = useElectionCreateContext();
  const navigate = useNavigate();

  // if no election data was stored, navigate back to beginning
  if (!state.election) {
    return <Navigate to="/elections/create" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new StringFormData(event.currentTarget);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const category = formData.get("category") as ElectionCategory;
    dispatch({
      type: "SET_CATEGORY_TYPE",
      electionCategory: category,
    });
    await navigate("/elections/create/list-of-candidates");
  }

  return (
    <section className="md">
      <Form title={t("election.polling_station_type.title")} onSubmit={(e) => void handleSubmit(e)}>
        <FormLayout>
          <FormLayout.Section>
            <p>{t("election.polling_station_type.description")}</p>

            <ChoiceList>
              <ChoiceList.Legend>{t("election.polling_station_type.choose")}</ChoiceList.Legend>
              <ChoiceList.Radio
                id="gsb"
                name={"category"}
                label={t("election.polling_station_type.gsb")}
                defaultValue={"Municipal"}
                defaultChecked={state.electionCategory === "Municipal" || !state.electionCategory}
              ></ChoiceList.Radio>
              <ChoiceList.Radio
                id="csb"
                name={"category"}
                label={t("election.polling_station_type.csb")}
                defaultValue={"Central"}
                defaultChecked={state.electionCategory === "Central"}
              ></ChoiceList.Radio>
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
