import * as React from "react";

import {
  ApiResponseErrorData,
  DataEntryResponse,
  DifferencesCounts,
  Election,
  PoliticalGroupVotes,
  PollingStationResults,
  usePollingStationDataEntry,
  VotersCounts,
  VotersRecounts,
  VotesCounts,
} from "@kiesraad/api";

export interface Recounted {
  yes: boolean;
  no: boolean;
}

export interface PollingStationValues {
  differences_counts: DifferencesCounts;
  political_group_votes: PoliticalGroupVotes[];
  recounted?: boolean;
  voters_counts: VotersCounts;
  voters_recounts?: VotersRecounts;
  votes_counts: VotesCounts;
}

export interface PollingStationFormControllerProps {
  election: Required<Election>;
  pollingStationId: number;
  entryNumber: number;
  children: React.ReactNode;
}

export interface iPollingStationControllerContext {
  loading: boolean;
  error: ApiResponseErrorData | null;
  data: DataEntryResponse | null;
  values: PollingStationValues;
  setValues: React.Dispatch<React.SetStateAction<PollingStationValues>>;
  setTemporaryCache: (cache: AnyCache | null) => boolean;
  cache: AnyCache | null;
}

//store unvalidated data
export type TemporaryCache<T> = {
  key: string;
  data: T;
  id?: number;
};

export interface TemporaryCacheRecounted extends TemporaryCache<Recounted> {
  key: "recounted";
}

export interface TemporaryCacheVotersAndVotes
  extends TemporaryCache<
    Pick<PollingStationValues, "voters_counts" | "votes_counts" | "voters_recounts">
  > {
  key: "voters_and_votes";
}

export interface TemporaryCacheDifferences
  extends TemporaryCache<PollingStationValues["differences_counts"]> {
  key: "differences";
}

export interface TemporaryCachePoliticalGroupVotes
  extends TemporaryCache<PollingStationValues["political_group_votes"][0]> {
  key: "political_group_votes";
}

export type AnyCache =
  | TemporaryCacheRecounted
  | TemporaryCacheVotersAndVotes
  | TemporaryCacheDifferences
  | TemporaryCachePoliticalGroupVotes;

export const PollingStationControllerContext = React.createContext<
  iPollingStationControllerContext | undefined
>(undefined);

export function PollingStationFormController({
  election,
  pollingStationId,
  entryNumber,
  children,
}: PollingStationFormControllerProps) {
  const [doRequest, { data, loading, error }] = usePollingStationDataEntry({
    polling_station_id: pollingStationId,
    entry_number: entryNumber,
  });

  const temporaryCache = React.useRef<AnyCache | null>(null);

  const [values, _setValues] = React.useState<PollingStationValues>(() => ({
    recounted: undefined,
    voters_counts: {
      poll_card_count: 0,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 0,
    },
    votes_counts: {
      votes_candidates_counts: 0,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 0,
    },
    voters_recounts: undefined,
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 0,
      other_explanation_count: 0,
      no_explanation_count: 0,
    },
    political_group_votes: election.political_groups.map((pg) => ({
      number: pg.number,
      total: 0,
      candidate_votes: pg.candidates.map((c) => ({
        number: c.number,
        votes: 0,
      })),
    })),
  }));

  const _isCalled = React.useRef<boolean>(false);

  const setValues = React.useCallback((values: React.SetStateAction<PollingStationValues>) => {
    _isCalled.current = true;
    _setValues((old) => {
      const newValues = typeof values === "function" ? values(old) : values;
      return {
        ...old,
        ...newValues,
      };
    });
  }, []);

  const setTemporaryCache = React.useCallback((cache: AnyCache | null) => {
    //OPTIONAL: allow only cache for unvalidated data
    temporaryCache.current = cache;
    return true;
  }, []);

  React.useEffect(() => {
    if (_isCalled.current) {
      const postValues: PollingStationResults = {
        ...values,
        recounted: values.recounted !== undefined ? values.recounted : false,
      };
      doRequest({
        data: postValues,
      });
    }
  }, [doRequest, values]);

  return (
    <PollingStationControllerContext.Provider
      value={{
        values,
        setValues,
        loading,
        error,
        data,
        cache: temporaryCache.current,
        setTemporaryCache,
      }}
    >
      {children}
    </PollingStationControllerContext.Provider>
  );
}
