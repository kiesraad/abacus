import { type FormEvent, type ReactNode, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { isError, isSuccess } from "@/api/ApiResult.ts";
import { useCrud } from "@/api/useCrud.ts";
import { Alert } from "@/components/ui/Alert/Alert.tsx";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t } from "@/i18n/translate";
import type {
  ELECTION_IMPORT_VALIDATE_REQUEST_PATH,
  ElectionDefinitionValidateResponse,
  ElectionRole,
} from "@/types/generated/openapi.ts";
import { StringFormData } from "@/utils/stringFormData.ts";
import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function PollingStationRole() {
  const { state, dispatch } = useElectionCreateContext();
  const navigate = useNavigate();
  const [error, setError] = useState<ReactNode | undefined>();
  const createPath: ELECTION_IMPORT_VALIDATE_REQUEST_PATH = `/api/elections/import/validate`;
  const { create } = useCrud<ElectionDefinitionValidateResponse>({ createPath });

  // if no election data was stored, navigate back to beginning
  if (!state.election) {
    return <Navigate to="/elections/create" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new StringFormData(event.currentTarget);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const role = formData.get("role") as ElectionRole;
    const response = await create({
      role: role,
      election_data: state.electionDefinitionData,
    });
    if (isSuccess(response)) {
      dispatch({
        type: "SET_ROLE_TYPE",
        electionRole: role,
      });
      setError(undefined);
      await navigate("/elections/create/list-of-candidates");
    } else if (isError(response)) {
      setError(t("election.invalid_role"));
    }
  }

  return (
    <section className="md">
      <Form title={t("election.polling_station_type.title")} onSubmit={(e) => void handleSubmit(e)}>
        <FormLayout>
          <FormLayout.Section>
            {error && (
              <Alert type="error" title={t("election.invalid_role")} inline>
                <p>{error}</p>
              </Alert>
            )}

            <p>{t("election.polling_station_type.description")}</p>

            <ChoiceList>
              <ChoiceList.Legend>{t("election.polling_station_type.choose")}</ChoiceList.Legend>
              <ChoiceList.Radio
                id="gsb"
                name={"role"}
                label={t("election.roles.GSB.full")}
                defaultValue={"GSB"}
                defaultChecked={state.electionRole === "GSB" || !state.electionRole}
              ></ChoiceList.Radio>
              <ChoiceList.Radio
                id="csb"
                name={"role"}
                label={t("election.roles.CSB.full")}
                defaultValue={"CSB"}
                defaultChecked={state.electionRole === "CSB"}
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
