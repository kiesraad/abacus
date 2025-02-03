import { useEffect, useRef, useState } from "react";

import { useFormKeyboardNavigation } from "@kiesraad/ui";

import { getErrorsAndWarnings } from "../state/dataEntryUtils";
import { SubmitCurrentFormOptions } from "../state/types";
import { useDataEntryContext } from "../state/useDataEntryContext";
import {
  CandidateVotesFormValues,
  CandidateVotesValues,
  formValuesToValues,
  valuesToFormValues,
} from "./candidatesVotesValues";

export function useCandidateVotes(political_group_number: number) {
  const { error, cache, status, pollingStationResults, formState, onSubmitForm, updateFormSection } =
    useDataEntryContext({
      id: `political_group_votes_${political_group_number}`,
      type: "political_group_votes",
      number: political_group_number,
    });

  const politicalGroupVotes = pollingStationResults.political_group_votes.find(
    (pg) => pg.number === political_group_number,
  );
  if (!politicalGroupVotes) {
    throw new Error(`Political group votes not found for number ${political_group_number}`);
  }

  // local form state
  const defaultValues =
    cache?.key === `political_group_votes_${political_group_number}`
      ? (cache.data as CandidateVotesValues)
      : (pollingStationResults.political_group_votes.find(
          (pg) => pg.number === political_group_number,
        ) as CandidateVotesValues);

  const [currentValues, setCurrentValues] = useState<CandidateVotesFormValues>(valuesToFormValues(defaultValues));

  // derived state
  const section = formState.sections[`political_group_votes_${political_group_number}`];
  if (!section) {
    throw new Error(`Form section not found for political group number ${political_group_number}`);
  }

  const { errors, warnings, isSaved, acceptWarnings, hasChanges } = section;

  const defaultProps = {
    errorsAndWarnings: isSaved ? getErrorsAndWarnings(errors, warnings) : undefined,
    warningsAccepted: acceptWarnings,
  };

  // register changes when fields change
  const setValues = (values: CandidateVotesFormValues) => {
    if (!hasChanges) {
      updateFormSection({ hasChanges: true, acceptWarnings: false, acceptWarningsError: false });
    }
    setCurrentValues(values);
  };

  const setAcceptWarnings = (acceptWarnings: boolean) => {
    updateFormSection({ acceptWarnings });
  };

  // form keyboard navigation
  const formRef = useRef<HTMLFormElement>(null);
  useFormKeyboardNavigation(formRef);

  // submit and save to form contents
  const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
    const data: CandidateVotesValues = formValuesToValues(currentValues);
    return await onSubmitForm(
      {
        political_group_votes: pollingStationResults.political_group_votes.map((pg) =>
          pg.number === political_group_number ? data : pg,
        ),
      },
      options,
    );
  };

  // scroll to top when saved
  useEffect(() => {
    if (isSaved || error) {
      window.scrollTo(0, 0);
    }
  }, [isSaved, error]);

  return {
    error,
    formRef,
    onSubmit,
    pollingStationResults,
    currentValues,
    formSection: section,
    setValues,
    status,
    setAcceptWarnings,
    defaultProps,
  };
}

// export function useDataEntryForm<TValues, TFormValues>(
//   sectionReference:FormSectionReference,
//   getValues: (pollingStationResults: PollingStationResults) => TValues,
//   valuesToFormValues: (values: TValues) => TFormValues,
//   getData: (pollingStationResults: PollingStationResults) => Partial<PollingStationResults>,
// ) {
//   const { cache, status, pollingStationResults, formState, onSubmitForm, updateFormSection } = useDataEntryContext(sectionReference);

//   // local form state
//   const defaultValues =
//     cache?.key === sectionReference.id
//       ? (cache.data as TValues)
//       : getValues(pollingStationResults);

//   const [currentValues, setCurrentValues] = useState<TFormValues>(valuesToFormValues(defaultValues));

//   // derived state
//   const section = formState.sections[sectionReference.id];
//   if (!section) {
//     throw new Error(`Form section not found for ${sectionReference.id}`);
//   }

//   const { errors, warnings, isSaved, acceptWarnings, hasChanges } = section;

//   const defaultProps = {
//     errorsAndWarnings: isSaved ? getErrorsAndWarnings(errors, warnings) : undefined,
//     warningsAccepted: acceptWarnings,
//   };

//   // register changes when fields change
//   const setValues = (values: TFormValues) => {
//     if (!hasChanges) {
//       updateFormSection({ hasChanges: true, acceptWarnings: false, acceptWarningsError: false });
//     }
//     setCurrentValues(values);
//   };

//   const setAcceptWarnings = (acceptWarnings: boolean) => {
//     updateFormSection({ acceptWarnings });
//   };

//   // form keyboard navigation
//   const formRef = useRef<HTMLFormElement>(null);
//   useFormKeyboardNavigation(formRef);

//   // submit and save to form contents
//   const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
//     return await onSubmitForm(
//       getData(pollingStationResults),
//       options,
//     );
//   };

//   // scroll to top when saved
//   useEffect(() => {
//     if (isSaved) {
//       window.scrollTo(0, 0);
//     }
//   }, [isSaved]);

//   return {
//     formRef,
//     onSubmit,
//     pollingStationResults,
//     currentValues,
//     formSection: section,
//     setValues,
//     status,
//     setAcceptWarnings,
//     defaultProps,
//   };
// }
