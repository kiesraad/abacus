import * as React from "react";
import {
  ApiResponseErrorData,
  DataEntryResponse,
  Election,
  PollingStationResults,
  usePollingStationDataEntry,
} from "@kiesraad/api";

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
  values: PollingStationResults;
  setValues: React.Dispatch<React.SetStateAction<PollingStationResults>>;
  setTemporaryCache: (cache: AnyCache | null) => boolean;
  cache: AnyCache | null;
}

//store unvalidated data
export type TemporaryCache<T> = {
  key: string;
  data: T;
  id?: number;
};

export interface TemporaryCacheVotersAndVotes
  extends TemporaryCache<Pick<PollingStationResults, "voters_counts" | "votes_counts">> {
  key: "voters_and_votes";
}

export interface TemporaryCachePoliticalGroupVotes
  extends TemporaryCache<PollingStationResults["political_group_votes"][0]> {
  key: "political_group_votes";
}

export interface TemporaryCacheDifferences
  extends TemporaryCache<PollingStationResults["differences_counts"]> {
  key: "differences";
}

export type AnyCache =
  | TemporaryCacheVotersAndVotes
  | TemporaryCachePoliticalGroupVotes
  | TemporaryCacheDifferences;

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

  const [values, _setValues] = React.useState<PollingStationResults>(() => ({
    political_group_votes: election.political_groups.map((pg) => ({
      number: pg.number,
      total: 0,
      candidate_votes: pg.candidates.map((c) => ({
        number: c.number,
        votes: 0,
      })),
    })),
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 0,
      other_explanation_count: 0,
      no_explanation_count: 0,
    },
    voters_counts: {
      proxy_certificate_count: 0,
      total_admitted_voters_count: 0,
      voter_card_count: 0,
      poll_card_count: 0,
    },
    votes_counts: {
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 0,
      votes_candidates_counts: 0,
    },
  }));

  const _isCalled = React.useRef<boolean>(false);

  const setValues = React.useCallback((values: React.SetStateAction<PollingStationResults>) => {
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
    console.log("Setting cache?", cache);
    //OPTIONAL: allow only cache for unvalidated data
    temporaryCache.current = cache;
    return true;
  }, []);

  React.useEffect(() => {
    if (_isCalled.current) {
      doRequest({
        data: values,
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
