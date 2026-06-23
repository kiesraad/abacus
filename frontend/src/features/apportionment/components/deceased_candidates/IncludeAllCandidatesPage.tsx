import { type SubmitEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { type AnyApiError, type ApiResult, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import type {
  ApportionmentState,
  REGISTER_DECEASED_CANDIDATES_REQUEST_PATH,
  SKIP_DECEASED_CANDIDATES_REQUEST_PATH,
} from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import { renderTitleAndHeader } from "../../utils/utils";
import { ApportionmentError } from "../ApportionmentError";

function renderForm(radioError: boolean, handleSubmit: (e: SubmitEvent<HTMLFormElement>) => void) {
  return (
    <Form
      onSubmit={(e) => {
        handleSubmit(e);
      }}
    >
      <FormLayout>
        <FormLayout.Section>
          <div>
            <h2>{t("apportionment.include_all_candidates.title")}</h2>
            <p>{t("apportionment.include_all_candidates.description")}</p>
          </div>
          <ChoiceList>
            {radioError && (
              <ChoiceList.Error id="include_all_candidates_error">
                {t("apportionment.include_all_candidates.mandatory_question")}
              </ChoiceList.Error>
            )}
            <ChoiceList.Radio
              id="no_deceased"
              name="include_all_candidates"
              label={t("apportionment.include_all_candidates.no_deceased")}
              value="no_deceased"
            />
            <ChoiceList.Radio
              id="has_deceased"
              name="include_all_candidates"
              label={t("apportionment.include_all_candidates.has_deceased")}
              value="has_deceased"
            />
          </ChoiceList>
        </FormLayout.Section>
        <FormLayout.Controls>
          <Button type="submit">{t("next")}</Button>
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}

export function IncludeAllCandidatesPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { state, error, isLoading, refetch } = useApportionmentContext();
  const [apiError, setApiError] = useState<AnyApiError>();
  const [radioError, setRadioError] = useState(false);
  const client = useApiClient();

  if (apiError) {
    throw apiError;
  }

  useEffect(() => {
    if (state?.type === "RegisteringDeceasedCandidates") {
      if (state.deceased_candidates.length === 0) {
        void navigate(`/elections/${election.id}/apportionment/deceased-candidates/add`);
      } else {
        void navigate(`/elections/${election.id}/apportionment/deceased-candidates`);
      }
    } else if (state?.type === "DrawingLots" || state?.type === "Finalised") {
      void navigate(`/elections/${election.id}/apportionment`);
    }
  });

  if (isLoading) {
    return <Loader />;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setRadioError(false);
    const formData = new StringFormData(event.currentTarget);
    const includeAllCandidatesChoice = formData.get("include_all_candidates");

    if (includeAllCandidatesChoice === null) {
      setRadioError(true);
      return;
    }

    const path: REGISTER_DECEASED_CANDIDATES_REQUEST_PATH | SKIP_DECEASED_CANDIDATES_REQUEST_PATH =
      `/api/elections/${election.id}/apportionment/${includeAllCandidatesChoice === "no_deceased" ? "skip_deceased_candidates" : "register_deceased_candidates"}`;
    const response: ApiResult<ApportionmentState> = await client.postRequest(path);

    if (isSuccess(response)) {
      void refetch();
    } else {
      setApiError(response);
    }
  }

  return (
    <>
      {renderTitleAndHeader(t("apportionment.title"))}
      <main>
        <article>
          {error ? (
            <ApportionmentError error={error} />
          ) : (
            state?.type === "Uninitialised" && (
              <>
                <FormLayout.Alert>
                  <Alert type="success">
                    <strong className="heading-md">{t("apportionment.data_entry_finished")}</strong>
                    <p>{t("apportionment.make_apportionment_definitive")}</p>
                  </Alert>
                </FormLayout.Alert>
                {renderForm(radioError, (e: SubmitEvent<HTMLFormElement>) => {
                  void handleSubmit(e);
                })}
              </>
            )
          )}
        </article>
      </main>
    </>
  );
}
