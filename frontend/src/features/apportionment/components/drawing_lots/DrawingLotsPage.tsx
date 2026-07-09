import { type ReactNode, type SubmitEvent, useEffect, useState } from "react";
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
  PoliticalGroup,
} from "@/types/generated/openapi";
import { getCandidateFullName } from "@/utils/candidate";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import {
  apportionmentCheckStateAndRedirect,
  isCandidateDrawingLots,
  isListDrawingLotsVariant,
  renderTitleAndHeader,
} from "../../utils/utils";
import { ApportionmentErrorPage } from "../ApportionmentError";
import { DrawingLotsForCandidate } from "./DrawingLotsForCandidate";
import { DrawingLotsForList } from "./DrawingLotsForList";
import { DrawingLotsForP9 } from "./DrawingLotsForP9";

function renderChoiceListRadio(option: { value: number; label: string }) {
  return (
    <ChoiceList.Radio
      id={`${option.value}`}
      key={option.value}
      name={"option_drawn"}
      defaultChecked={false}
      defaultValue={option.value}
      label={option.label}
    />
  );
}

interface DrawingLotsContent {
  title: string;
  legend: string;
  explanation: ReactNode;
  radioOptions: { value: number; label: string }[];
}

function getContent(
  state: ApportionmentState | undefined,
  politicalGroups: PoliticalGroup[],
): DrawingLotsContent | undefined {
  if (state === undefined || state.type !== "DrawingLots") return undefined;

  if (isCandidateDrawingLots(state)) {
    const list = politicalGroups.find((pg) => pg.number === state.drawing_lots_required.list);
    if (list === undefined) {
      return undefined;
    }
    const candidates = list.candidates.filter((candidate) =>
      state.drawing_lots_required.options.includes(candidate.number),
    );
    return {
      title: t("apportionment.drawing_lots_for_candidate.title"),
      legend: t("apportionment.drawing_lots_result.which_candidate_gets_the_seat"),
      explanation: (
        <DrawingLotsForCandidate
          drawingLotsRequired={state.drawing_lots_required}
          options={candidates}
          list={list.name}
        />
      ),
      radioOptions: candidates.map((candidate) => ({
        value: candidate.number,
        label: `${candidate.number}. ${getCandidateFullName(candidate, true)}`,
      })),
    };
  }

  const politicalGroupOptions = politicalGroups.filter((pg) => state.drawing_lots_required.options.includes(pg.number));
  const radioOptions = politicalGroupOptions.map((pg) => ({ value: pg.number, label: formatPoliticalGroupName(pg) }));

  if (isListDrawingLotsVariant(state, ["HighestAverageResidualSeat", "LargestRemainderResidualSeat"])) {
    return {
      title: t("apportionment.drawing_lots_for_list.title", {
        number: state.drawing_lots_required.residual_seat_numbers[0] || "",
      }),
      legend: t("apportionment.drawing_lots_result.which_list_gets_a_residual_seat"),
      explanation: (
        <DrawingLotsForList drawingLotsRequired={state.drawing_lots_required} options={politicalGroupOptions} />
      ),
      radioOptions,
    };
  }

  if (isListDrawingLotsVariant(state, ["AbsoluteMajorityHighestAverage", "AbsoluteMajorityLargestRemainder"])) {
    return {
      title: t("apportionment.drawing_lots_for_p9.title", {
        assign_to: state.drawing_lots_required.assign_to,
      }),
      legend: t("apportionment.drawing_lots_result.which_list_has_to_give_up_a_seat"),
      explanation: <DrawingLotsForP9 drawingLotsRequired={state.drawing_lots_required} />,
      radioOptions,
    };
  }
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
    const content = getContent(state, election.political_groups);
    if (content !== undefined) {
      return (
        <>
          {renderTitleAndHeader(content.title)}
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
                      {content.explanation}
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
                        <ChoiceList.Legend>{content.legend}</ChoiceList.Legend>
                        {radioError && (
                          <ChoiceList.Error id="option_drawn_error">
                            {t("apportionment.mandatory_question")}
                          </ChoiceList.Error>
                        )}
                        {content.radioOptions.map((option) => renderChoiceListRadio(option))}
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
