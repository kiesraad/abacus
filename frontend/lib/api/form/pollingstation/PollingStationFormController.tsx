import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getBaseUrl, getUrlForFormSectionID } from "app/component/pollingstation/utils";

import {
  ApiError,
  ApiResponseStatus,
  buildFormState,
  Election,
  getClientState,
  GetDataEntryResponse,
  getInitialFormState,
  getInitialValues,
  getNextSectionID,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH,
  PollingStationResults,
  SaveDataEntryRequest,
  SaveDataEntryResponse,
  updateFormStateAfterSubmit,
  useApi,
  useApiGetRequest,
  ValidationResult,
  VotersRecounts,
} from "@kiesraad/api";

export interface PollingStationFormControllerProps {
  election: Required<Election>;
  pollingStationId: number;
  entryNumber: number;
  children: React.ReactNode;
  defaultValues?: Partial<PollingStationResults>;
  defaultFormState?: Partial<FormState>;
  defaultCurrentForm?: AnyFormReference | null;
}

export interface FormReference<T> {
  type: string;
  id: FormSectionID;
  getValues: () => T;
  getAcceptWarnings?: () => boolean;
}

export interface FormReferenceRecounted extends FormReference<Pick<PollingStationResults, "recounted">> {
  type: "recounted";
}

export interface FormReferenceVotersAndVotes
  extends FormReference<Pick<PollingStationResults, "voters_counts" | "votes_counts" | "voters_recounts">> {
  type: "voters_and_votes";
}

export interface FormReferenceDifferences extends FormReference<Pick<PollingStationResults, "differences_counts">> {
  type: "differences";
}

export interface FormReferencePoliticalGroupVotes
  extends FormReference<PollingStationResults["political_group_votes"][0]> {
  type: "political_group_votes";
  number: number;
}

export interface FormReferenceSave extends FormReference<object> {
  type: "save";
}

export type AnyFormReference =
  | FormReferenceRecounted
  | FormReferenceVotersAndVotes
  | FormReferenceDifferences
  | FormReferencePoliticalGroupVotes
  | FormReferenceSave;

interface SubmitCurrentFormOptions {
  acceptWarnings?: boolean;
  aborting?: boolean;
  continueToNextSection?: boolean;
}

export interface iPollingStationControllerContext {
  status: React.RefObject<Status>;
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

export type FormSectionID =
  | "recounted"
  | "voters_votes_counts"
  | "differences_counts"
  | `political_group_votes_${number}`
  | "save";

export type FormSection = {
  index: number; //fixate the order of filling in sections
  id: FormSectionID;
  title?: string;
  isSaved: boolean; //whether this section has been sent to the server
  isSubmitted?: boolean; //whether this section has been submitted in the latest request
  acceptWarnings: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
};

export interface ClientValidationResult extends ValidationResult {
  isGlobal?: boolean;
}

export interface FormState {
  // the furthest form section that the user has reached
  furthest: FormSectionID;
  // the form section that the user is currently working on
  current: FormSectionID;
  sections: Record<FormSectionID, FormSection>;
}

export interface ClientState {
  furthest: FormSectionID;
  current: FormSectionID;
  acceptedWarnings: FormSectionID[];
  continue: boolean;
}

//store unvalidated data
export type TemporaryCache = {
  key: FormSectionID;
  data: unknown;
};

export const PollingStationControllerContext = React.createContext<iPollingStationControllerContext | undefined>(
  undefined,
);

export const INITIAL_FORM_SECTION_ID: FormSectionID = "recounted";

// Status of the form controller
// This is a type instead of an enum because of https://github.com/ArnaudBarre/eslint-plugin-react-refresh/issues/36
export type Status = "idle" | "saving" | "deleting" | "deleted" | "finalising" | "finalised" | "aborted";

export function PollingStationFormController({
  election,
  pollingStationId,
  entryNumber,
  children,
  defaultValues = undefined,
  defaultFormState = undefined,
  defaultCurrentForm = null,
}: PollingStationFormControllerProps) {
  const requestPath: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
  const { client } = useApi();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = React.useState<PollingStationResults>();
  const [formState, setFormState] = React.useState<FormState>();

  const [apiError, setApiError] = React.useState<ApiError | null>(null);

  // the form section to navigate to next
  const [targetFormSectionID, setTargetFormSectionID] = React.useState<FormSectionID | null>(null);

  // status as ref, because it needs to immediately propagate to the blocker function in `PollingStationFormNavigation`
  const status = React.useRef<Status>("idle");

  // reference to the current form on screen
  const currentForm = React.useRef<AnyFormReference | null>(defaultCurrentForm);

  const temporaryCache = React.useRef<TemporaryCache | null>(null);
  const setTemporaryCache = React.useCallback((cache: TemporaryCache | null) => {
    //OPTIONAL: allow only cache for unvalidated data
    temporaryCache.current = cache;
    return true;
  }, []);

  const initialDataRequest = useApiGetRequest<GetDataEntryResponse>(requestPath);
  React.useEffect(() => {
    if (initialDataRequest.data) {
      const responseData = initialDataRequest.data;
      setValues(responseData.data);

      if (responseData.client_state) {
        const { formState, targetFormSectionID } = buildFormState(
          responseData.client_state as ClientState,
          responseData.validation_results,
          election,
        );
        setTargetFormSectionID(targetFormSectionID);
        setFormState(formState);
      } else {
        setFormState(getInitialFormState(election));
        setTargetFormSectionID(INITIAL_FORM_SECTION_ID);
      }
    } else if (initialDataRequest.error) {
      if (initialDataRequest.error.code === 404) {
        // data entry not found, set initial values
        const values = getInitialValues(election, defaultValues);
        const formState = getInitialFormState(election, defaultFormState);
        setValues(values);
        setFormState(formState);
        setTargetFormSectionID(INITIAL_FORM_SECTION_ID);

        // save initial data entry
        const clientState = getClientState(formState, false, false);
        const requestBody: SaveDataEntryRequest = {
          data: values,
          client_state: clientState,
        };
        void client.postRequest(requestPath, requestBody).then((response) => {
          if (response.status !== ApiResponseStatus.Success) {
            setApiError(response);
            return;
          }
        });
      } else {
        setApiError(initialDataRequest.error);
      }
    }
  }, [
    defaultValues,
    defaultFormState,
    election,
    pollingStationId,
    initialDataRequest.data,
    initialDataRequest.error,
    client,
    requestPath,
  ]);

  // check if the targetFormSectionID has changed and navigate to the url for that section
  React.useEffect(() => {
    if (!targetFormSectionID) return;
    const url = getUrlForFormSectionID(election.id, pollingStationId, targetFormSectionID);
    if (location.pathname === getBaseUrl(election.id, pollingStationId)) {
      navigate(url, { replace: true });
    } else if (location.pathname !== url) {
      navigate(url);
    }
    setTargetFormSectionID(null);
  }, [targetFormSectionID, navigate, election.id, pollingStationId, location.pathname]);

  const registerCurrentForm = React.useCallback(
    (form: AnyFormReference) => {
      if (formState === undefined) {
        throw new Error("Form state is undefined, cannot register form");
      }
      if (currentForm.current === null || form.id !== currentForm.current.id) {
        currentForm.current = form;
      }
      if (form.id !== formState.current) {
        setFormState((old) => {
          if (old === undefined) {
            throw new Error("Form state is undefined, cannot register form");
          }
          const newFormState = structuredClone(old);
          const currentSection = newFormState.sections[newFormState.current];
          if (currentSection) {
            currentSection.isSubmitted = false;
          }
          newFormState.current = form.id;
          return newFormState;
        });
      }
    },
    [currentForm, formState],
  );

  if (values === undefined || formState === undefined) {
    // do not continue while loading initial data
    return null;
  }

  const submitCurrentForm = async ({
    acceptWarnings = false,
    aborting = false,
    continueToNextSection = true,
  }: SubmitCurrentFormOptions = {}) => {
    // React state is fixed within one render, so we update our own copy instead of using setValues directly
    let newValues: PollingStationResults = structuredClone(values);
    if (currentForm.current) {
      const ref: AnyFormReference = currentForm.current;

      switch (ref.type) {
        case "political_group_votes":
          newValues = {
            ...values,
            political_group_votes: values.political_group_votes.map((pg) => {
              if (pg.number === ref.number) {
                return ref.getValues();
              }
              return pg;
            }),
          };
          break;
        case "recounted": {
          const formValues = ref.getValues();
          let voters_recounts: VotersRecounts | undefined = undefined;
          if (formValues.recounted) {
            if (values.voters_recounts) {
              voters_recounts = values.voters_recounts;
            } else {
              voters_recounts = {
                poll_card_recount: 0,
                proxy_certificate_recount: 0,
                voter_card_recount: 0,
                total_admitted_voters_recount: 0,
              };
            }
          }
          newValues = {
            ...values,
            ...formValues,
            voters_recounts,
          };
          break;
        }
        case "voters_and_votes":
        case "differences":
        default:
          newValues = {
            ...values,
            ...ref.getValues(),
          };
          break;
      }
      setValues(newValues);
    }

    // prepare data to send to server
    const clientState = getClientState(formState, acceptWarnings, continueToNextSection);

    // send data to server
    status.current = "saving";
    const response = await client.postRequest(requestPath, {
      data: newValues,
      client_state: clientState,
    } satisfies SaveDataEntryRequest);
    status.current = aborting ? "aborted" : "idle";

    if (response.status !== ApiResponseStatus.Success) {
      setApiError(response);
      return;
    }

    const data = response.data as SaveDataEntryResponse;
    setApiError(null);

    const newFormState = structuredClone(formState);
    updateFormStateAfterSubmit(newFormState, data.validation_results, acceptWarnings, !aborting);
    setFormState(newFormState);

    if (continueToNextSection) {
      setTargetFormSectionID(getNextSectionID(newFormState));
    }
  };

  const deleteDataEntry = async () => {
    status.current = "deleting";
    const response = await client.deleteRequest(requestPath);
    // ignore 404, as it means the data entry was never saved or already deleted
    if (response.status !== ApiResponseStatus.Success && response.code !== 404) {
      status.current = "idle";
      throw response.withContext("Failed to delete data entry");
    }
    status.current = "deleted";
  };

  const finaliseDataEntry = async () => {
    status.current = "finalising";
    const response = await client.postRequest(requestPath + "/finalise");
    if (response.status !== ApiResponseStatus.Success) {
      status.current = "idle";
      setApiError(response);
    } else {
      setApiError(null);
      status.current = "finalised";
    }
  };

  return (
    <PollingStationControllerContext.Provider
      value={{
        status,
        apiError,
        formState,
        values,
        cache: temporaryCache.current,
        setTemporaryCache,
        currentForm: currentForm.current,
        registerCurrentForm,
        submitCurrentForm,
        deleteDataEntry,
        finaliseDataEntry,
        pollingStationId,
      }}
    >
      {children}
    </PollingStationControllerContext.Provider>
  );
}
