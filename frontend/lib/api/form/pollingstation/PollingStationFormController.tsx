import * as React from "react";

import {
  addValidationResultToFormState,
  ApiResponseErrorData,
  ApiResponseStatus,
  DataEntryResponse,
  Election,
  isGlobalValidationResult,
  POLLING_STATION_DATA_ENTRY_REQUEST_PATH,
  PollingStationResults,
  useApi,
  ValidationResult,
  VotersRecounts,
} from "@kiesraad/api";

import { formSectionComplete, getNextSection, resetFormSectionState } from "./pollingStationUtils";

export interface PollingStationValues extends Omit<PollingStationResults, "recounted"> {
  recounted: boolean | undefined;
}

export interface PollingStationFormControllerProps {
  election: Required<Election>;
  pollingStationId: number;
  entryNumber: number;
  children: React.ReactNode;
  defaultValues?: Partial<PollingStationValues>;
  defaultFormState?: Partial<FormState>;
  defaultCurrentForm?: AnyFormReference | null;
}

export interface FormReference<T> {
  type: string;
  id: FormSectionID;
  getValues: () => T;
  getIgnoreWarnings?: () => boolean;
}

export interface FormReferenceRecounted extends FormReference<Pick<PollingStationValues, "recounted">> {
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

export interface iPollingStationControllerContext {
  status: React.RefObject<Status>;
  error: ApiResponseErrorData | null;
  formState: FormState;
  targetFormSection: FormSectionID | null;
  values: PollingStationValues;
  setTemporaryCache: (cache: TemporaryCache | null) => boolean;
  cache: TemporaryCache | null;
  currentForm: AnyFormReference | null;
  submitCurrentForm: (ignoreWarnings?: boolean) => Promise<void>;
  registerCurrentForm: (form: AnyFormReference) => void;
  deleteDataEntry: () => Promise<void>;
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
  isSaved: boolean; //has this section been sent to the server
  isSubmitted?: boolean; //has this section been submitted in the latest request
  ignoreWarnings: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
};

export interface ClientValidationResult extends ValidationResult {
  isGlobal?: boolean;
}

export interface FormState {
  current: FormSectionID; //the current step that needs completion
  active: FormSectionID; //the form that is currently active
  sections: Record<FormSectionID, FormSection>;
  unknown: {
    errors: ClientValidationResult[];
    warnings: ClientValidationResult[];
  };
  isCompleted: boolean;
}

//store unvalidated data
export type TemporaryCache = {
  key: FormSectionID;
  data: unknown;
};

export const PollingStationControllerContext = React.createContext<iPollingStationControllerContext | undefined>(
  undefined,
);

const INITIAL_FORM_SECTION_ID: FormSectionID = "recounted";

// Status of the form controller
// This is a type instead of an enum because of https://github.com/ArnaudBarre/eslint-plugin-react-refresh/issues/36
export type Status = "idle" | "saving" | "deleting" | "deleted";

export function PollingStationFormController({
  election,
  pollingStationId,
  entryNumber,
  children,
  defaultValues = {},
  defaultFormState = {},
  defaultCurrentForm = null,
}: PollingStationFormControllerProps) {
  const request_path: POLLING_STATION_DATA_ENTRY_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;

  const temporaryCache = React.useRef<TemporaryCache | null>(null);

  //reference to the current form on screen
  const currentForm = React.useRef<AnyFormReference | null>(defaultCurrentForm);

  //where to navigate to next
  const [targetFormSection, setTargetFormSection] = React.useState<FormSectionID | null>(INITIAL_FORM_SECTION_ID);

  // status as ref, because it needs to immediately propagate to the blocker function in `PollingStationFormNavigation`
  const status = React.useRef<Status>("idle");

  // TODO: #277 render custom error page instead of passing error down
  const [error, setError] = React.useState<ApiResponseErrorData | null>(null);

  const [formState, setFormState] = React.useState<FormState>(() => {
    const result: FormState = {
      active: INITIAL_FORM_SECTION_ID,
      current: INITIAL_FORM_SECTION_ID,
      sections: {
        recounted: {
          index: 0,
          id: "recounted",
          title: "Is er herteld?",
          isSaved: false,
          ignoreWarnings: false,
          errors: [],
          warnings: [],
        },
        voters_votes_counts: {
          index: 1,
          id: "voters_votes_counts",
          title: "Toegelaten kiezers en uitgebrachte stemmen",
          isSaved: false,
          ignoreWarnings: false,
          errors: [],
          warnings: [],
        },
        differences_counts: {
          index: 2,
          id: "differences_counts",
          title: "Verschillen",
          isSaved: false,
          ignoreWarnings: false,
          errors: [],
          warnings: [],
        },
        save: {
          index: election.political_groups.length + 3,
          id: "save",
          title: "Controleren en opslaan",
          isSaved: false,
          ignoreWarnings: false,
          errors: [],
          warnings: [],
        },
      },
      unknown: {
        errors: [],
        warnings: [],
      },
      isCompleted: false,
    };

    election.political_groups.forEach((pg, n) => {
      result.sections[`political_group_votes_${pg.number}`] = {
        index: n + 3,
        id: `political_group_votes_${pg.number}`,
        title: pg.name,
        isSaved: false,
        ignoreWarnings: false,
        errors: [],
        warnings: [],
      };
    });

    return structuredClone({ ...result, ...defaultFormState });
  });
  const { client } = useApi();

  const [values, setValues] = React.useState<PollingStationValues>(() => ({
    recounted: undefined,
    voters_counts: {
      poll_card_count: 0,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 0,
    },
    votes_counts: {
      votes_candidates_count: 0,
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
    ...defaultValues,
  }));

  const setTemporaryCache = React.useCallback((cache: TemporaryCache | null) => {
    //OPTIONAL: allow only cache for unvalidated data
    temporaryCache.current = cache;
    return true;
  }, []);

  //tell the "outside world" which form section to show next
  React.useEffect(() => {
    const activeSection = formState.sections[formState.active];
    if (activeSection) {
      if (activeSection.isSubmitted) {
        if (formSectionComplete(activeSection)) {
          const nextSectionID = getNextSection(formState, activeSection);
          setTargetFormSection(nextSectionID);
        }
      }
    }
  }, [formState]);

  const registerCurrentForm = React.useCallback(
    (form: AnyFormReference) => {
      if (currentForm.current === null || form.id !== currentForm.current.id) {
        currentForm.current = form;
        if (form.id !== formState.active) {
          setFormState((old) => {
            const newFormState = { ...old };
            const oldActive = old.sections[old.active];
            if (oldActive) {
              oldActive.isSubmitted = false;
            }
            newFormState.active = form.id;
            return newFormState;
          });
          setTargetFormSection(null);
        }
      }
    },
    [currentForm, formState],
  );

  const submitCurrentForm = async (ignoreWarnings = false) => {
    // React state is fixed within one render, so we update our own copy instead of using setValues directly
    let newValues: PollingStationValues = values;
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
            if (values.recounted === false) {
              voters_recounts = {
                poll_card_recount: 0,
                proxy_certificate_recount: 0,
                voter_card_recount: 0,
                total_admitted_voters_recount: 0,
              };
            } else {
              voters_recounts = values.voters_recounts;
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
      //when submitting, all previous errors and warnings are invalid
      setFormState((old) => {
        const newFormState = { ...old };
        resetFormSectionState(newFormState);
        return newFormState;
      });
    }

    // prepare data
    const pollingStationResults: PollingStationResults = {
      ...newValues,
      recounted: newValues.recounted !== undefined ? newValues.recounted : false,
      voters_recounts: newValues.recounted ? newValues.voters_recounts : undefined,
    };

    // send data to server
    status.current = "saving";
    const response = await client.postRequest(request_path, { data: pollingStationResults });
    status.current = "idle";
    if (response.status !== ApiResponseStatus.Success) {
      // TODO: #277 render custom error page
      console.error("Failed to save data entry", response);
      setError(response.data as ApiResponseErrorData);
      throw new Error("Failed to save data entry");
    }
    const data = response.data as DataEntryResponse;

    // update form state based on response
    setFormState((old) => {
      const newFormState = { ...old };
      //reset all errors/warnings, and submitted, the server validates the entire request each time.
      //a reset is done before submitting the form to the server.

      const activeFormSection = newFormState.sections[newFormState.active];

      if (activeFormSection) {
        //store that this section has been sent to the server
        activeFormSection.isSaved = true;
        //store that this section has been submitted, this resets on each request
        activeFormSection.isSubmitted = true;
        //flag ignore warnings
        activeFormSection.ignoreWarnings = ignoreWarnings;
      }

      //distribute errors to sections
      addValidationResultToFormState(newFormState, data.validation_results.errors, "errors");
      //distribute warnings to sections
      addValidationResultToFormState(newFormState, data.validation_results.warnings, "warnings");

      //what form section is active
      if (activeFormSection) {
        //determine new current if applicable
        if (newFormState.current === activeFormSection.id) {
          if (
            activeFormSection.errors.length === 0 ||
            activeFormSection.errors.every((vr) => isGlobalValidationResult(vr))
          ) {
            if (activeFormSection.warnings.length === 0 || activeFormSection.ignoreWarnings) {
              const nextSectionID = getNextSection(newFormState, activeFormSection);
              if (nextSectionID) {
                newFormState.current = nextSectionID;
              }
              if (nextSectionID === "save") {
                newFormState.isCompleted = true;
              }
            }
          }
        }
      }

      //if the entire form is not completed yet, filter out global validation results since they don't have meaning yet.
      if (!newFormState.isCompleted) {
        Object.values(newFormState.sections).forEach((section) => {
          section.errors = section.errors.filter((err) => !isGlobalValidationResult(err));
          section.warnings = section.warnings.filter((err) => !isGlobalValidationResult(err));
        });
      }

      return newFormState;
    });
  };

  const deleteDataEntry = async () => {
    status.current = "deleting";
    const response = await client.deleteRequest(request_path);
    // ignore 404, as it means the data entry was never saved or already deleted
    if (response.status !== ApiResponseStatus.Success && response.code !== 404) {
      // TODO: #277 render custom error page
      console.error("Failed to delete data entry", response);
      status.current = "idle";
      throw new Error("Failed to delete data entry");
    }
    status.current = "deleted";
  };

  return (
    <PollingStationControllerContext.Provider
      value={{
        status,
        error,
        formState,
        values,
        cache: temporaryCache.current,
        setTemporaryCache,
        currentForm: currentForm.current,
        registerCurrentForm,
        submitCurrentForm,
        targetFormSection,
        deleteDataEntry,
      }}
    >
      {children}
    </PollingStationControllerContext.Provider>
  );
}
