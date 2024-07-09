import * as React from "react";
import { DataEntryResponse, Election, PollingStationResults } from "../../gen/openapi";
import { usePollingStationDataEntry } from "../../usePollingStationDataEntry";
import { ApiResponseErrorData } from "../../ApiClient";

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
}

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

  const [values, setValues] = React.useState<PollingStationResults>({
    political_group_votes: election.political_groups.map((pg) => ({
      number: pg.number,
      total: 0,
      candidate_votes: pg.candidates.map((c) => ({
        number: c.number,
        votes: 0,
      })),
    })),
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
  });

  // const setSectionValues = React.useCallback(
  //   <K extends keyof PollingStationResults>(key:K, values:PollingStationResults[K]) => {
  //     setValues(prev => ({
  //       ...prev,
  //       [key]: values
  //     }))
  //   }, []);

  React.useEffect(() => {
    doRequest({
      data: values,
    });
  }, [doRequest, values]);

  return (
    <PollingStationControllerContext.Provider
      value={{
        values,
        setValues,
        loading,
        error,
        data,
      }}
    >
      {children}
    </PollingStationControllerContext.Provider>
  );
}
