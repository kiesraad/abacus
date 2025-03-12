import { useEffect, useRef, useState } from "react";

import { useFormKeyboardNavigation } from "@/components/ui";
import { getErrorsAndWarnings } from "@/features/data_entry/stores/dataEntryUtils";
import { SubmitCurrentFormOptions } from "@/features/data_entry/stores/types";
import { useDataEntryContext } from "@/features/data_entry/stores/useDataEntryContext";

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
  const [missingTotalError, setMissingTotalError] = useState(false);

  // derived state
  const formSection = formState.sections[`political_group_votes_${political_group_number}`];
  if (!formSection) {
    throw new Error(`Form section not found for political group number ${political_group_number}`);
  }

  const { errors, warnings, isSaved, acceptWarnings, hasChanges } = formSection;
  const showAcceptWarnings = formSection.warnings.length > 0 && formSection.errors.length === 0 && !hasChanges;

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
    updateFormSection({ acceptWarningsError: false, acceptWarnings });
  };

  // form keyboard navigation
  const formRef = useRef<HTMLFormElement>(null);
  useFormKeyboardNavigation(formRef);

  // submit and save to form contents
  const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
    const data: CandidateVotesValues = formValuesToValues(currentValues);
    const isMissingTotal = currentValues.candidate_votes.some((v) => v !== "") && !currentValues.total;
    setMissingTotalError(isMissingTotal);
    if (isMissingTotal) {
      return false;
    }
    return await onSubmitForm(
      {
        political_group_votes: pollingStationResults.political_group_votes.map((pg) =>
          pg.number === political_group_number ? data : pg,
        ),
      },
      { ...options, showAcceptWarnings },
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
    formSection,
    setValues,
    status,
    setAcceptWarnings,
    defaultProps,
    missingTotalError,
    showAcceptWarnings,
  };
}
