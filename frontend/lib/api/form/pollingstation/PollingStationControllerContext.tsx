import { createContext, RefObject } from "react";

import { ApiError, PollingStationResults } from "@kiesraad/api";

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
  submitCurrentForm: (params?: SubmitCurrentFormOptions) => Promise<void>;
  registerCurrentForm: (form: AnyFormReference) => void;
  deleteDataEntry: () => Promise<void>;
  finaliseDataEntry: () => Promise<void>;
  pollingStationId: number;
}

export const PollingStationControllerContext = createContext<iPollingStationControllerContext | undefined>(undefined);
