import { createContext, RefObject } from "react";

import { ApiError, ApiResult, PollingStationResults, SaveDataEntryResponse } from "@kiesraad/api";

import {
  AnyFormReference,
  FormState,
  Status,
  SubmitCurrentFormOptions,
  TemporaryCache,
} from "./PollingStationFormController";

export interface iPollingStationControllerContext {
  status: RefObject<Status>;
  apiError: ApiError | null;
  formState: FormState;
  values: PollingStationResults;
  setTemporaryCache: (cache: TemporaryCache | null) => boolean;
  cache: TemporaryCache | null;
  currentForm: AnyFormReference | null;
  submitCurrentForm: (params?: SubmitCurrentFormOptions) => Promise<ApiResult<SaveDataEntryResponse, ApiError>>;
  registerCurrentForm: (form: AnyFormReference) => void;
  deleteDataEntry: () => Promise<void>;
  finaliseDataEntry: () => Promise<void>;
  pollingStationId: number;
  entryNumber: number;
}

export const PollingStationControllerContext = createContext<iPollingStationControllerContext | undefined>(undefined);
