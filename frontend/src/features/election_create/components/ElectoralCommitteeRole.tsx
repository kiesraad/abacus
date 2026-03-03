import { type FormEvent, type ReactNode, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Alert } from "@/components/ui/Alert/Alert.tsx";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t } from "@/i18n/translate";
import { StringFormData } from "@/utils/stringFormData.ts";
import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function ElectoralCommitteeRole() {
  const { state, dispatch } = useElectionCreateContext();
  const navigate = useNavigate();
  const [error] = useState<ReactNode | undefined>();

  // if no election data was stored, navigate back to beginning
  if (!state.election) {
    return <Navigate to="/elections/create" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new StringFormData(event.currentTarget);
    const committeeCategory = formData.getString("committee_category");
    if (!committeeCategory || (committeeCategory !== "GSB" && committeeCategory !== "CSB")) {
      return;
    }

    dispatch({
      type: "SET_COMMITTEE_CATEGORY",
      committeeCategory,
    });
    await navigate("/elections/create/list-of-candidates");
  }

  return (
    <section className="md">
      <Form title={t("election.electoral_committee_role.title")} onSubmit={(e) => void handleSubmit(e)}>
        <FormLayout>
          <FormLayout.Section>
            {error && (
              <Alert type="error" title={t("election.invalid_role")} inline>
                <p>{error}</p>
              </Alert>
            )}

            <p>{t("election.electoral_committee_role.description")}</p>

            <ChoiceList>
              <ChoiceList.Legend>{t("election.electoral_committee_role.choose")}</ChoiceList.Legend>
              <ChoiceList.Radio
                id="gsb"
                name={"committee_category"}
                label={t("committee_category.GSB.full")}
                defaultValue={"GSB"}
                defaultChecked={state.committeeCategory === "GSB" || !state.committeeCategory}
              ></ChoiceList.Radio>
              <ChoiceList.Radio
                id="csb"
                name={"committee_category"}
                label={t("committee_category.CSB.full")}
                defaultValue={"CSB"}
                defaultChecked={state.committeeCategory === "CSB"}
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
