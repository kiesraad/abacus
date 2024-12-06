import * as React from "react";

import {
  LimitedApiRequestState,
  POLLING_STATION_CREATE_REQUEST_BODY,
  POLLING_STATION_CREATE_REQUEST_PATH,
  POLLING_STATION_DELETE_REQUEST_PATH,
  POLLING_STATION_UPDATE_REQUEST_BODY,
  POLLING_STATION_UPDATE_REQUEST_PATH,
  PollingStation,
} from "@kiesraad/api";

import { useCrud } from "../useCrud";

export type PollingStationSubmitCreate = (electionId: number, obj: POLLING_STATION_CREATE_REQUEST_BODY) => void;
export type PollingStationSubmitUpdate = (pollingStationId: number, obj: POLLING_STATION_UPDATE_REQUEST_BODY) => void;
export type PollingStationSubmitRemove = (pollingStationId: number) => void;

export type UsePollingStationMutationReturn = {
  create: PollingStationSubmitCreate;
  update: PollingStationSubmitUpdate;
  remove: PollingStationSubmitRemove;
  requestState: LimitedApiRequestState<PollingStation>;
};

export function usePollingStationMutation(): UsePollingStationMutationReturn {
  const { requestState, create: crudCreate, update: crudUpdate, remove: crudRemove } = useCrud<PollingStation>(true);

  const create: PollingStationSubmitCreate = React.useCallback(
    (electionId, obj) => {
      const path: POLLING_STATION_CREATE_REQUEST_PATH = `/api/elections/${electionId}/polling_stations`;

      void crudCreate(path, obj);
    },
    [crudCreate],
  );

  const update: PollingStationSubmitUpdate = React.useCallback(
    (pollingStationId, obj) => {
      const path: POLLING_STATION_UPDATE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}`;

      void crudUpdate(path, obj);
    },
    [crudUpdate],
  );

  const remove: PollingStationSubmitRemove = React.useCallback(
    (pollingStationId) => {
      const path: POLLING_STATION_DELETE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}`;

      void crudRemove(path);
    },
    [crudRemove],
  );

  return { create, update, remove, requestState };
}
