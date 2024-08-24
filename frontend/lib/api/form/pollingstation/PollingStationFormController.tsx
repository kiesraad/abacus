import * as React from "react";

import {
  ApiResponseErrorData,
  ApiResponseStatus,
  DataEntryResponse,
  Election,
  POLLING_STATION_DATA_ENTRY_REQUEST_PATH,
  PollingStationResults,
  useApi,
  usePollingStationDataEntry,
  ValidationResult,
} from "@kiesraad/api";

import {
  addValidationResultToFormState,
  formSectionComplete,
  getNextSection,
  isGlobalValidationResult,
  resetFormSectionState,
} from "./pollingStationUtils";

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
}

export interface FormReferenceRecounted
  extends FormReference<Pick<PollingStationValues, "recounted">> {
  type: "recounted";
}

export interface FormReferenceVotersAndVotes
  extends FormReference<
    Pick<PollingStationResults, "voters_counts" | "votes_counts" | "voters_recounts">
  > {
  type: "voters_and_votes";
}

export interface FormReferenceDifferences
  extends FormReference<Pick<PollingStationResults, "differences_counts">> {
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
  loading: boolean;
  error: ApiResponseErrorData | null;
  data: DataEntryResponse | null;
  formState: FormState;
  targetFormSection: FormSectionID | null;
  values: PollingStationValues;
  setValues: React.Dispatch<React.SetStateAction<PollingStationValues>>;
  setTemporaryCache: (cache: TemporaryCache | null) => boolean;
  cache: TemporaryCache | null;
  currentForm: AnyFormReference | null;
  submitCurrentForm: (ignoreWarnings?: boolean) => void;
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

export const PollingStationControllerContext = React.createContext<
  iPollingStationControllerContext | undefined
>(undefined);

const INITIAL_FORM_SECTION_ID: FormSectionID = "recounted";

export function PollingStationFormController({
  election,
  pollingStationId,
  entryNumber,
  children,
  defaultValues = {},
  defaultFormState = {},
  defaultCurrentForm = null,
}: PollingStationFormControllerProps) {
  const [doRequest, { data, loading, error }] = usePollingStationDataEntry({
    polling_station_id: pollingStationId,
    entry_number: entryNumber,
  });

  const temporaryCache = React.useRef<TemporaryCache | null>(null);

  //reference to the current form on screen
  const currentForm = React.useRef<AnyFormReference | null>(defaultCurrentForm);

  //consumable flag to ignore warnings for the active form section;
  const _ignoreWarnings = React.useRef<FormSectionID | null>(null);

  //where to navigate to next
  const [targetFormSection, setTargetFormSection] = React.useState<FormSectionID | null>(
    INITIAL_FORM_SECTION_ID,
  );

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

    return { ...result, ...defaultFormState };
  });
  const { client } = useApi();

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
    ...defaultValues,
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

  const setTemporaryCache = React.useCallback((cache: TemporaryCache | null) => {
    //OPTIONAL: allow only cache for unvalidated data
    temporaryCache.current = cache;
    return true;
  }, []);

  React.useEffect(() => {
    if (data) {
      //form state changes based of validation results in data.
      setFormState((old) => {
        const newFormState = { ...old };
        //reset all errors/warnings, and submitted, the server validates the entire request each time.
        //a reset is done before submitting the form to the server.
        //resetFormSectionState(newFormState);

        const activeFormSection = newFormState.sections[newFormState.active];

        if (activeFormSection) {
          //store that this section has been sent to the server
          activeFormSection.isSaved = true;
          //store that this section has been submitted, this resets on each request
          activeFormSection.isSubmitted = true;
          //flag ignore warnings
          activeFormSection.ignoreWarnings = _ignoreWarnings.current === activeFormSection.id;
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
    }
  }, [data]);

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

  const submitCurrentForm = React.useCallback(
    (ignoreWarnings?: boolean) => {
      if (currentForm.current) {
        const ref: AnyFormReference = currentForm.current;

        //flag this submit to ignore warnings
        _ignoreWarnings.current = ignoreWarnings ? ref.id : null;

        switch (ref.type) {
          case "political_group_votes":
            setValues((old) => ({
              ...old,
              political_group_votes: old.political_group_votes.map((pg) => {
                if (pg.number === ref.number) {
                  return ref.getValues();
                }
                return pg;
              }),
            }));
            break;
          case "recounted": {
            const newValues = ref.getValues();
            setValues((old) => ({
              ...old,
              ...newValues,
              voters_recounts:
                newValues.recounted && old.voters_recounts !== undefined
                  ? { ...old.voters_recounts }
                  : undefined,
            }));
            break;
          }
          case "voters_and_votes":
          case "differences":
          default:
            setValues((old) => ({
              ...old,
              ...ref.getValues(),
            }));
            break;
        }
        //when submitting, all previous errors and warnings are invalid
        setFormState((old) => {
          const newFormState = { ...old };
          resetFormSectionState(newFormState);
          return newFormState;
        });
      }
    },
    [setValues, currentForm],
  );

  React.useEffect(() => {
    if (_isCalled.current) {
      const postValues: PollingStationResults = {
        ...values,
        recounted: values.recounted !== undefined ? values.recounted : false,
        voters_recounts: values.recounted ? values.voters_recounts : undefined,
      };
      doRequest({
        data: postValues,
      });
    }
  }, [doRequest, values]);

  const deleteDataEntry = async () => {
    const path: POLLING_STATION_DATA_ENTRY_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
    const response = await client.deleteRequest(path);
    if (response.status !== ApiResponseStatus.Success && response.code !== 404) {
      console.error("Failed to delete data entry", response);
      throw new Error("Failed to delete data entry");
    }
  };

  return (
    <PollingStationControllerContext.Provider
      value={{
        formState,
        values,
        setValues,
        loading,
        error,
        data,
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
