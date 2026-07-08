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
import type {
  ADD_CANDIDATE_DRAWN_REQUEST_PATH,
  ADD_LIST_DRAWN_REQUEST_PATH,
  ApportionmentState,
  Candidate,
  PoliticalGroup,
} from "@/types/generated/openapi";
import { getCandidateFullName } from "@/utils/candidate";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import {
  apportionmentCheckStateAndRedirect,
  isCandidate,
  isCandidateDrawingLots,
  isCandidateList,
  isListDrawingLotsVariant,
  isPoliticalGroupList,
  renderTitleAndHeader,
} from "../../utils/utils";
import { ApportionmentErrorPage } from "../ApportionmentError";
import { DrawingLotsForCandidate } from "./DrawingLotsForCandidate";
import { DrawingLotsForList } from "./DrawingLotsForList";
import { DrawingLotsForP9 } from "./DrawingLotsForP9";

function getPageTitle(state: ApportionmentState) {
  if (isListDrawingLotsVariant(state, ["HighestAverageResidualSeat", "LargestRemainderResidualSeat"])) {
    return t("apportionment.drawing_lots_for_list.title", {
      number: state.drawing_lots_required.residual_seat_numbers[0] || "",
    });
  } else if (isListDrawingLotsVariant(state, ["AbsoluteMajorityHighestAverage", "AbsoluteMajorityLargestRemainder"])) {
    return t("apportionment.drawing_lots_for_p9.title", {
      assign_to: state.drawing_lots_required.assign_to || "",
    });
  } else if (isCandidateDrawingLots(state)) {
    return t("apportionment.drawing_lots_for_candidate.title");
  }
  return t("apportionment.drawing_lots");
}

function renderListSection(
  state: ApportionmentState,
  options: Candidate[] | PoliticalGroup[],
  politicalGroups: PoliticalGroup[],
) {
  return (
    <FormLayout.Section>
      <div>
        <h2>{t("apportionment.drawing_lots_necessary")}</h2>
        {isListDrawingLotsVariant(state, ["HighestAverageResidualSeat", "LargestRemainderResidualSeat"]) &&
        isPoliticalGroupList(options) ? (
          <DrawingLotsForList drawingLotsRequired={state.drawing_lots_required} options={options} />
        ) : isListDrawingLotsVariant(state, ["AbsoluteMajorityLargestRemainder", "AbsoluteMajorityHighestAverage"]) ? (
          <DrawingLotsForP9 drawingLotsRequired={state.drawing_lots_required} />
        ) : (
          isCandidateDrawingLots(state) &&
          isCandidateList(options) && (
            <DrawingLotsForCandidate
              drawingLotsRequired={state.drawing_lots_required}
              options={options}
              list={politicalGroups.find((pg) => pg.number === state.drawing_lots_required.list)?.name || ""}
            />
          )
        )}
      </div>
    </FormLayout.Section>
  );
}

function renderInstructions() {
  return (
    <FormLayout.Section>
      <div>
        <h3 className="mb-md">{t("apportionment.drawing_lots_instructions.title")}</h3>
        <p className="w-32">{t("apportionment.drawing_lots_instructions.description")}</p>
      </div>
    </FormLayout.Section>
  );
}

function renderChoiceListLegend(state: ApportionmentState) {
  return (
    <ChoiceList.Legend>
      {isListDrawingLotsVariant(state, ["HighestAverageResidualSeat", "LargestRemainderResidualSeat"])
        ? t("apportionment.drawing_lots_result.which_list_gets_a_residual_seat")
        : isListDrawingLotsVariant(state, ["AbsoluteMajorityHighestAverage", "AbsoluteMajorityLargestRemainder"])
          ? t("apportionment.drawing_lots_result.which_list_has_to_give_up_a_seat")
          : isCandidateDrawingLots(state) && t("apportionment.drawing_lots_result.which_candidate_gets_the_seat")}
    </ChoiceList.Legend>
  );
}

function renderChoiceListRadio(option: PoliticalGroup | Candidate) {
  return (
    <ChoiceList.Radio
      id={`${option.number}`}
      key={option.number}
      name={"option_drawn"}
      defaultChecked={false}
      defaultValue={option.number}
      label={
        isCandidate(option)
          ? `${option.number}. ${getCandidateFullName(option, true)}`
          : formatPoliticalGroupName(option)
      }
    />
  );
}

export function DrawingLotsPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { error, state, refetch } = useApportionmentContext();
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

    const path: ADD_LIST_DRAWN_REQUEST_PATH | ADD_CANDIDATE_DRAWN_REQUEST_PATH = isCandidateDrawingLots(state)
      ? `/api/elections/${election.id}/apportionment/add_candidate_drawn`
      : `/api/elections/${election.id}/apportionment/add_list_drawn`;
    const response = await client.postRequest(path, payload);

    if (isSuccess(response)) {
      await refetch();
      void navigate(`/elections/${election.id}/apportionment`);
    } else {
      setApiError(response);
    }
  };

  if (error) {
    return <ApportionmentErrorPage sectionTitle={t("apportionment.drawing_lots")} error={error} />;
  }

  if (state && state.type === "DrawingLots") {
    const options = isCandidateDrawingLots(state)
      ? election.political_groups
          .find((pg) => pg.number === state.drawing_lots_required.list)
          ?.candidates.filter((candidate) => state.drawing_lots_required.options.includes(candidate.number))
      : election.political_groups.filter((pg) => state.drawing_lots_required.options.includes(pg.number));
    if (options !== undefined) {
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
                  {renderListSection(state, options, election.political_groups)}
                  {renderInstructions()}
                  <FormLayout.Section>
                    <div>
                      <h3 className="mb-md">{t("apportionment.drawing_lots_result.title")}</h3>
                      <ChoiceList>
                        {renderChoiceListLegend(state)}
                        {radioError && (
                          <ChoiceList.Error id="option_drawn_error">
                            {t("apportionment.mandatory_question")}
                          </ChoiceList.Error>
                        )}
                        {options.map((option) => renderChoiceListRadio(option))}
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
}
