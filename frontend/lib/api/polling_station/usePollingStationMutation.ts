import * as React from "react";

import {
  LimitedApiRequestState,
  POLLING_STATION_CREATE_REQUEST_BODY,
  POLLING_STATION_CREATE_REQUEST_PATH,
  POLLING_STATION_UPDATE_REQUEST_BODY,
  POLLING_STATION_UPDATE_REQUEST_PATH,
  PollingStation,
} from "@kiesraad/api";
import { callAsync } from "@kiesraad/util";

import { useCrud } from "../useCrud";

export type PollingStationSubmitCreate = (electionId: number, obj: POLLING_STATION_CREATE_REQUEST_BODY) => void;
export type PollingStationSubmitUpdate = (pollingStationId: number, obj: POLLING_STATION_UPDATE_REQUEST_BODY) => void;

export type UsePollingStationMutationReturn = {
  create: PollingStationSubmitCreate;
  update: PollingStationSubmitUpdate;
  requestState: LimitedApiRequestState<PollingStation>;
};

export function usePollingStationMutation(): UsePollingStationMutationReturn {
  const { requestState, create: crudCreate, update: crudUpdate } = useCrud<PollingStation>(true);

  const create: PollingStationSubmitCreate = React.useCallback(
    (electionId, obj) => {
      const path: POLLING_STATION_CREATE_REQUEST_PATH = `/api/elections/${electionId}/polling_stations`;

      callAsync(crudCreate, path, obj);
    },
    [crudCreate],
  );

  const update: PollingStationSubmitUpdate = React.useCallback(
    (pollingStationId, obj) => {
      const path: POLLING_STATION_UPDATE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}`;

      callAsync(crudUpdate, path, obj);
    },
    [crudUpdate],
  );

  return { create, update, requestState };
}
