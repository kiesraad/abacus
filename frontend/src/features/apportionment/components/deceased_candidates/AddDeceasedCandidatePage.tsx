import { useEffect, useState } from "react";
import { type NavigateFunction, useNavigate } from "react-router";
import { type AnyApiError, type ApiResult, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { CandidateList } from "@/components/ui/CandidateList/CandidateList";
import { Loader } from "@/components/ui/Loader/Loader";
import { ProgressList } from "@/components/ui/ProgressList/ProgressList";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import type {
  ADD_DECEASED_CANDIDATE_REQUEST_BODY,
  ADD_DECEASED_CANDIDATE_REQUEST_PATH,
  ApportionmentState,
  DeceasedCandidate,
  PoliticalGroup,
} from "@/types/generated/openapi";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import { renderTitleAndHeader } from "../../utils/utils";
import { ApportionmentError } from "../ApportionmentError";
import cls from "./DeceasedCandidates.module.css";

function checkStateAndRedirect(state: ApportionmentState | undefined, electionId: number, navigate: NavigateFunction) {
  if (state?.type === "Uninitialised") {
    void navigate(`/elections/${electionId}/apportionment/include-all-candidates`);
  } else if (state?.type === "DrawingLots" || state?.type === "Finalised") {
    void navigate(`/elections/${electionId}/apportionment`);
  }
}

export function AddDeceasedCandidatePage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { state, error, isLoading, refetchState } = useApportionmentContext();
  const [apiError, setApiError] = useState<AnyApiError>();
  const [selectedList, setSelectedList] = useState<PoliticalGroup | undefined>(election.political_groups.at(0));
  const client = useApiClient();

  if (apiError) {
    throw apiError;
  }

  useEffect(() => {
    checkStateAndRedirect(state, election.id, navigate);
  });

  if (isLoading) {
    return <Loader />;
  }

  let deceasedCandidates: DeceasedCandidate[] | undefined;
  if (state && state.type !== "Uninitialised" && selectedList) {
    deceasedCandidates = state.deceased_candidates.filter((dc) => dc.pg_number === selectedList.number);
  }

  async function handleAddDeceasedCandidate(candidateNumber: number, pgNumber: number) {
    const path: ADD_DECEASED_CANDIDATE_REQUEST_PATH = `/api/elections/${election.id}/apportionment/add_deceased_candidate`;
    const body: ADD_DECEASED_CANDIDATE_REQUEST_BODY = { candidate_number: candidateNumber, pg_number: pgNumber };
    const response: ApiResult<ApportionmentState> = await client.postRequest(path, body);

    if (isSuccess(response)) {
      await refetchState();
      void navigate(`/elections/${election.id}/apportionment/deceased-candidates`);
    } else {
      setApiError(response);
    }
  }

  return (
    <>
      {renderTitleAndHeader(t("candidate.deceased.singular"))}
      <main>
        {error && error.reference === "ApportionmentCommitteeSessionNotCompleted" ? (
          <ApportionmentError error={error} />
        ) : (
          state?.type === "RegisteringDeceasedCandidates" && (
            <div className={cls.container}>
              <div className="w-39">{t("apportionment.indicate_deceased_candidate")}</div>
              <div className={cls.section}>
                <StickyNav>
                  <ProgressList>
                    <ProgressList.Fixed>
                      {election.political_groups.map((group) => (
                        <ProgressList.Item
                          key={group.number}
                          id={`list-item-group-${group.number}`}
                          status={"idle"}
                          active={group.number === selectedList?.number}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedList(group);
                            }}
                          >
                            {formatPoliticalGroupName(group)}
                          </button>
                        </ProgressList.Item>
                      ))}
                    </ProgressList.Fixed>
                  </ProgressList>
                </StickyNav>
                <article className="w-39">
                  {selectedList && (
                    <CandidateList
                      politicalGroup={selectedList}
                      deceasedCandidates={deceasedCandidates}
                      onClick={(candidateNumber, pgNumber) =>
                        void handleAddDeceasedCandidate(candidateNumber, pgNumber)
                      }
                    />
                  )}
                </article>
              </div>
            </div>
          )
        )}
      </main>
    </>
  );
}
