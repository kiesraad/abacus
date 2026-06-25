import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { type AnyApiError, type ApiResult, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { IconArrowRight } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Loader } from "@/components/ui/Loader/Loader";
import { Table } from "@/components/ui/Table/Table";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import type {
  ApportionmentState,
  Candidate,
  CandidateNumber,
  DELETE_DECEASED_CANDIDATE_REQUEST_BODY,
  DELETE_DECEASED_CANDIDATE_REQUEST_PATH,
  DeceasedCandidate,
  FINALISE_DECEASED_CANDIDATES_REQUEST_PATH,
  PGNumber,
  PoliticalGroup,
  RESET_APPORTIONMENT_STATE_REQUEST_PATH,
} from "@/types/generated/openapi";
import { getCandidateFullName } from "@/utils/candidate";
import { getPoliticalGroupName } from "@/utils/politicalGroup";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import { renderTitleAndHeader } from "../../utils/utils";
import { ApportionmentError } from "../ApportionmentError";
import cls from "./DeceasedCandidates.module.css";

interface DetailedDeceasedCandidate {
  candidate: Candidate;
  list_number: number;
  list_name: string;
}

function renderPageDescription(state: ApportionmentState, deceasedCandidates: DetailedDeceasedCandidate[]) {
  return (
    <>
      {state.type === "RegisteringDeceasedCandidates"
        ? t("apportionment.which_candidates_are_deceased")
        : `${t("apportionment.apportionment_already_calculated")} ${deceasedCandidates.length === 0 ? t("apportionment.no_candidates_are_deceased") : t("apportionment.below_candidates_are_deceased")}`}
    </>
  );
}

function renderDeceasedCandidatesTable(
  deceasedCandidates: DetailedDeceasedCandidate[],
  handleDeleteDeceasedCandidate: (candidateNumber: CandidateNumber, pgNumber: PGNumber) => void,
  withDeleteLink: boolean,
) {
  return (
    <Table id="deceased-candidates" className={cls.deceasedCandidatesTable}>
      <Table.Header>
        <Table.HeaderCell>{t("candidate.deceased.singular")}</Table.HeaderCell>
        <Table.HeaderCell>{t("list")}</Table.HeaderCell>
        <Table.HeaderCell>{t("apportionment.position_on_list")}</Table.HeaderCell>
        {withDeleteLink && <Table.HeaderCell />}
      </Table.Header>
      <Table.Body>
        {deceasedCandidates.map((deceasedCandidate) => {
          return (
            <Table.Row
              key={`${deceasedCandidate.list_number}-${deceasedCandidate.candidate.number}`}
              id={`list-${deceasedCandidate.list_number}-candidate-${deceasedCandidate.candidate.number}`}
            >
              <Table.Cell className={"bold"}>
                {getCandidateFullName(deceasedCandidate.candidate)}
                {<span className="superscript">&nbsp;&nbsp;&dagger;</span>}
              </Table.Cell>
              <Table.Cell>
                {getPoliticalGroupName(deceasedCandidate.list_number, deceasedCandidate.list_name)}
              </Table.Cell>
              <Table.Cell>{deceasedCandidate.candidate.number}</Table.Cell>
              {withDeleteLink && (
                <Table.Cell>
                  <Button
                    variant="underlined"
                    size="md"
                    onClick={() => {
                      handleDeleteDeceasedCandidate(deceasedCandidate.candidate.number, deceasedCandidate.list_number);
                    }}
                  >
                    {t("delete")}
                  </Button>
                </Table.Cell>
              )}
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}

function get_detailed_deceased_candidates(
  deceasedCandidates: DeceasedCandidate[],
  politicalGroups: PoliticalGroup[],
): DetailedDeceasedCandidate[] {
  const detailedDeceasedCandidates: DetailedDeceasedCandidate[] = [];
  deceasedCandidates.forEach((dc) => {
    const pg = politicalGroups.find((pg) => pg.number === dc.pg_number);
    if (pg) {
      const candidate = pg.candidates.find((candidate) => candidate.number === dc.candidate_number);
      if (candidate) {
        detailedDeceasedCandidates.push({
          candidate: candidate,
          list_number: pg.number,
          list_name: pg.name,
        } satisfies DetailedDeceasedCandidate);
      }
    }
  });
  return detailedDeceasedCandidates;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO: Is there any way to make this shorter?
export function DeceasedCandidatesPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { state, error, isLoading, refetch } = useApportionmentContext();
  const [apiError, setApiError] = useState<AnyApiError>();
  const client = useApiClient();

  if (apiError) {
    throw apiError;
  }

  useEffect(() => {
    if (state?.type === "Uninitialised") {
      void navigate(`/elections/${election.id}/apportionment/include-all-candidates`);
    }
  });

  if (isLoading) {
    return <Loader />;
  }

  let deceasedCandidates: DetailedDeceasedCandidate[] = [];
  if (state && state.type !== "Uninitialised") {
    deceasedCandidates = get_detailed_deceased_candidates(state.deceased_candidates, election.political_groups);
  }

  async function handleDeleteDeceasedCandidate(candidateNumber: number, pgNumber: number) {
    const path: DELETE_DECEASED_CANDIDATE_REQUEST_PATH = `/api/elections/${election.id}/apportionment/delete_deceased_candidate`;
    const body: DELETE_DECEASED_CANDIDATE_REQUEST_BODY = { candidate_number: candidateNumber, pg_number: pgNumber };
    const response: ApiResult<ApportionmentState> = await client.postRequest(path, body);

    if (isSuccess(response)) {
      void refetch();
    } else {
      setApiError(response);
    }
  }

  async function handleFinaliseDeceasedCandidates() {
    const path: FINALISE_DECEASED_CANDIDATES_REQUEST_PATH = `/api/elections/${election.id}/apportionment/finalise_deceased_candidates`;
    const response: ApiResult<ApportionmentState> = await client.postRequest(path);

    if (isSuccess(response)) {
      await refetch();
      void navigate(`/elections/${election.id}/apportionment`);
    } else {
      setApiError(response);
    }
  }

  async function handleResetApportionmentState() {
    const path: RESET_APPORTIONMENT_STATE_REQUEST_PATH = `/api/elections/${election.id}/apportionment/reset`;
    const response: ApiResult<ApportionmentState> = await client.postRequest(path);

    if (isSuccess(response)) {
      await refetch();
    } else {
      setApiError(response);
    }
  }

  return (
    <>
      {renderTitleAndHeader(t("candidate.deceased.plural"))}
      <main>
        <article>
          {error ? (
            <ApportionmentError error={error} />
          ) : (
            (state?.type === "RegisteringDeceasedCandidates" || state?.type === "Finalised") && (
              <div className={cls.container}>
                <div className="w-39">{renderPageDescription(state, deceasedCandidates)}</div>
                {deceasedCandidates.length > 0 && (
                  <div className="mt-sm">
                    {renderDeceasedCandidatesTable(
                      deceasedCandidates,
                      (candidateNumber, pgNumber) => void handleDeleteDeceasedCandidate(candidateNumber, pgNumber),
                      state.type === "RegisteringDeceasedCandidates",
                    )}
                  </div>
                )}
                {state.type === "RegisteringDeceasedCandidates" && (
                  <>
                    <div className="ml-md-lg">
                      <Button.Link
                        variant="underlined"
                        size="md"
                        to={`/elections/${election.id}/apportionment/deceased-candidates/add`}
                      >
                        {`+ ${t("candidate.add")}`}
                      </Button.Link>
                    </div>
                    <div className="mt-md-lg">
                      <Button onClick={() => void handleFinaliseDeceasedCandidates()}>
                        {t("apportionment.to_apportionment")}
                      </Button>
                    </div>
                  </>
                )}
                {state.type === "Finalised" && (
                  <div className="mt-md-lg">
                    {t("apportionment.want_to_make_changes")}
                    <div className={cls.resetSection}>
                      <Icon size="xs" icon={<IconArrowRight />} />
                      <Button variant="underlined" size="md" onClick={() => void handleResetApportionmentState()}>
                        {t("apportionment.redo_apportionment")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </article>
      </main>
    </>
  );
}
