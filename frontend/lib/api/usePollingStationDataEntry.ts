import * as React from "react";
import { useApiRequest } from "./useApiRequest";
import {
  DataEntryError,
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_REQUEST_PARAMS,
  POLLING_STATION_DATA_ENTRY_REQUEST_PATH
} from "./gen/openapi";
import { ApiResponseClientError, ApiResponseSuccess, ApiResponseServerError } from "./api";

//TODO: add to generate script
//TODO: Make camelcase
type POLLING_STATION_DATA_ENTRY_RESPONSE =
  | (Omit<Response, "json"> & {
      status: 200;
      json: () => ApiResponseSuccess | PromiseLike<ApiResponseSuccess>;
    })
  | (Omit<Response, "json"> & {
      status: 422;
      json: () => ApiResponseClientError | PromiseLike<ApiResponseClientError>;
    })
  | (Omit<Response, "json"> & {
      status: 500;
      json: () => ApiResponseServerError<DataEntryError> | PromiseLike<ApiResponseServerError<DataEntryError>>;
    })
  | (Omit<Response, "json"> & {
      status: number;
      json: () => never;
    });

export function usePollingStationDataEntry(params: POLLING_STATION_DATA_ENTRY_REQUEST_PARAMS) {
  const path = React.useMemo(() => {
    const result: POLLING_STATION_DATA_ENTRY_REQUEST_PATH = `/api/polling_stations/${params.id}/data_entries/${params.entry_number}`;
    return result;
  }, [params]);

  const responseHandler = React.useCallback(async (response: Response) => {
    const res = response as POLLING_STATION_DATA_ENTRY_RESPONSE;
    if (res.status === 200) {
      return { status: "20x", code: 200, message: "OK" } as ApiResponseSuccess;
    } else if (res.status === 422) {
      return { status: "40x", code: 422, message: "Unprocessable Entity" } as ApiResponseClientError;
    } else if (res.status === 500) {
      const data = await res.json();
      return {
        status: "50x",
        code: 500,
        message: "Internal Server Error",
        data
      } as ApiResponseServerError<DataEntryError>;
    }
    throw new Error(`Unexpected response status: ${res.status}`);
  }, []);

  return useApiRequest<
    POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
    ApiResponseSuccess,
    ApiResponseServerError<DataEntryError> | ApiResponseClientError
  >({
    path,
    responseHandler
  });
}
