import { type SubmitEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { type AnyApiError, type ApiResult, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";
import type {
  ApportionmentState,
  REGISTER_DECEASED_CANDIDATES_REQUEST_PATH,
  SKIP_DECEASED_CANDIDATES_REQUEST_PATH,
} from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import { renderTitleAndHeader } from "../../utils/utils";
import { ApportionmentError } from "../ApportionmentError";

export function IncludeAllCandidatesPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { state, error, refetchState } = useApportionmentContext();
  const [apiError, setApiError] = useState<AnyApiError>();
  const [radioError, setRadioError] = useState(false);
  const client = useApiClient();

  if (apiError) {
    throw apiError;
  }

  useEffect(() => {
    if (state.type === "RegisteringDeceasedCandidates") {
      void navigate(`/elections/${election.id}/apportionment/deceased-candidates`);
    } else if (state.type === "Finalised") {
      void navigate(`/elections/${election.id}/apportionment`);
    }
  });

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
      `/api/elections/${election.id}/apportionment/${includeAllCandidatesChoice === "yes" ? "skip_deceased_candidates" : "register_deceased_candidates"}`;
    const response: ApiResult<ApportionmentState> = await client.postRequest(path);

    if (isSuccess(response)) {
      void refetchState();
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
            state.type === "Uninitialised" && (
              <>
                <FormLayout.Alert>
                  <Alert type="success">
                    <strong className="heading-md">{t("apportionment.data_entry_finished")}</strong>
                    <p>{t("apportionment.make_apportionment_definitive")}</p>
                  </Alert>
                </FormLayout.Alert>
                <Form
                  onSubmit={(e) => {
                    void handleSubmit(e);
                  }}
                >
                  <FormLayout>
                    <FormLayout.Section>
                      <div>
                        <h2>{t("apportionment.include_all_candidates.title")}</h2>
                        <p>{tx("apportionment.include_all_candidates.description")}</p>
                      </div>
                      <ChoiceList>
                        {radioError && (
                          <ChoiceList.Error id="include_all_candidates_error">
                            {t("apportionment.include_all_candidates.mandatory_question")}
                          </ChoiceList.Error>
                        )}
                        <ChoiceList.Radio
                          id="yes"
                          name="include_all_candidates"
                          label={t("apportionment.include_all_candidates.yes")}
                          value="yes"
                        />
                        <ChoiceList.Radio
                          id="no"
                          name="include_all_candidates"
                          label={t("apportionment.include_all_candidates.no")}
                          value="no"
                        />
                      </ChoiceList>
                    </FormLayout.Section>
                    <FormLayout.Controls>
                      <Button type="submit">{t("next")}</Button>
                    </FormLayout.Controls>
                  </FormLayout>
                </Form>
              </>
            )
          )}
        </article>
      </main>
    </>
  );
}
