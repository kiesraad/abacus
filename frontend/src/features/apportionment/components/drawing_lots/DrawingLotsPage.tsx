import { type SubmitEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { type AnyApiError, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import type { ADD_LIST_DRAWN_REQUEST_PATH, ApportionmentState } from "@/types/generated/openapi";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import { apportionmentCheckStateAndRedirect, renderTitleAndHeader } from "../../utils/utils";
import { ApportionmentErrorPage } from "../ApportionmentError";
import { DrawingLotsForList } from "./DrawingLotsForList";

function getPageTitle(state: ApportionmentState) {
  if (state.type === "DrawingLots") {
    if (state.drawing_lots_required.type === "ListDrawingLotsRequired") {
      if (state.drawing_lots_required.variant !== "AbsoluteMajority") {
        return t("apportionment.drawing_lots_for_seat", {
          number: state.drawing_lots_required.residual_seat_numbers[0] || "",
        });
      }
    }
  }
  return t("apportionment.drawing_lots");
}

export function DrawingLotsPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { error, state, refetchState } = useApportionmentContext();
  const [apiError, setApiError] = useState<AnyApiError>();
  const [radioError, setRadioError] = useState(false);
  const client = useApiClient();

  if (apiError) {
    throw apiError;
  }

  useEffect(() => {
    apportionmentCheckStateAndRedirect(state, election.id, navigate);
    if (state?.type === "Finalised") {
      void navigate(`/elections/${election.id}/apportionment`);
    }
  });

  const submitForm = async (event: SubmitEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const optionDrawn = formData.get("option_drawn");

    if (optionDrawn === null || typeof optionDrawn !== "string") {
      setRadioError(true);
      return;
    }
    const payload = {
      variant: state?.type === "DrawingLots" ? state.drawing_lots_required : undefined,
      drawn: parseInt(optionDrawn, 10),
    };

    const path: ADD_LIST_DRAWN_REQUEST_PATH = `/api/elections/${election.id}/apportionment/add_list_drawn`;
    const response = await client.postRequest(path, payload);

    if (isSuccess(response)) {
      // TODO: Needs to refetch both state and apportionment result, will be done in #3422
      await refetchState();
      void navigate(`/elections/${election.id}/apportionment`);
    } else {
      setApiError(response);
    }
  };

  if (error) {
    return <ApportionmentErrorPage sectionTitle={t("apportionment.drawing_lots")} error={error} />;
  }

  if (state && state.type === "DrawingLots") {
    const options = election.political_groups.filter((pg) => state.drawing_lots_required.options.includes(pg.number));
    return (
      <>
        {renderTitleAndHeader(getPageTitle(state))}
        <main>
          <article>
            <Form
              onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
                event.preventDefault();
                void submitForm(event);
              }}
            >
              <FormLayout>
                <FormLayout.Section>
                  <div>
                    <h2>{t("apportionment.drawing_lots_necessary")}</h2>
                    <DrawingLotsForList state={state} />
                  </div>
                </FormLayout.Section>
                <FormLayout.Section>
                  <div>
                    <h3 className="mb-md">{t("apportionment.drawing_lots_instructions.title")}</h3>
                    <p className="w-32">{t("apportionment.drawing_lots_instructions.description")}</p>
                  </div>
                </FormLayout.Section>
                <FormLayout.Section>
                  <div>
                    <h3 className="mb-md">{t("apportionment.drawing_lots_result.title")}</h3>
                    <ChoiceList>
                      <ChoiceList.Legend>
                        {t("apportionment.drawing_lots_result.which_list_gets_a_residual_seat")}
                      </ChoiceList.Legend>
                      {radioError && (
                        <ChoiceList.Error id="option_drawn_error">
                          {t("apportionment.mandatory_question")}
                        </ChoiceList.Error>
                      )}
                      {options.map((pg) => (
                        <ChoiceList.Radio
                          id={`${pg.number}`}
                          key={pg.number}
                          name={"option_drawn"}
                          defaultChecked={false}
                          defaultValue={pg.number}
                          label={formatPoliticalGroupName(pg)}
                        />
                      ))}
                    </ChoiceList>
                  </div>
                </FormLayout.Section>
                <Button type="submit">{t("next")}</Button>
              </FormLayout>
            </Form>
          </article>
        </main>
      </>
    );
  }
}
