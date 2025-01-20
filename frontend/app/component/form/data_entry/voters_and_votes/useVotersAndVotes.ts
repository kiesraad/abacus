import * as React from "react";
import { FormEvent } from "react";

import { PollingStationResults } from "@kiesraad/api";
import { useFormKeyboardNavigation } from "@kiesraad/ui";
import { deepEqual, deformatNumber, formatNumber } from "@kiesraad/util";

import { getErrorsAndWarnings } from "../state/dataEntryUtils";
import { useDataEntryContext } from "../state/useDataEntryContext";

export type VotersAndVotesValues = Pick<PollingStationResults, "voters_counts" | "votes_counts" | "voters_recounts">;

export interface VotersAndVotesFormValues {
  poll_card_count: string;
  proxy_certificate_count: string;
  voter_card_count: string;
  total_admitted_voters_count: string;
  votes_candidates_count: string;
  blank_votes_count: string;
  invalid_votes_count: string;
  total_votes_cast_count: string;
  poll_card_recount: string;
  proxy_certificate_recount: string;
  voter_card_recount: string;
  total_admitted_voters_recount: string;
}

export function useVotersAndVotes() {
  const { temporaryCache, status, pollingStationResults, formState, onSubmitForm } = useDataEntryContext({
    id: "voters_votes_counts",
    type: "voters_and_votes",
  });

  if (pollingStationResults === null) {
    throw new Error("Polling station results not loaded");
  }

  let sectionValues = {
    voters_counts: pollingStationResults.voters_counts,
    votes_counts: pollingStationResults.votes_counts,
    voters_recounts: pollingStationResults.voters_recounts || undefined,
  } as VotersAndVotesValues;

  if (temporaryCache?.key === "voters_votes_counts") {
    sectionValues = temporaryCache.data as VotersAndVotesValues;
    // setTemporaryCache(null);
  }

  const defaultValues = {
    poll_card_count: formatNumber(sectionValues.voters_counts.poll_card_count),
    proxy_certificate_count: formatNumber(sectionValues.voters_counts.proxy_certificate_count),
    voter_card_count: formatNumber(sectionValues.voters_counts.voter_card_count),
    total_admitted_voters_count: formatNumber(sectionValues.voters_counts.total_admitted_voters_count),
    votes_candidates_count: formatNumber(sectionValues.votes_counts.votes_candidates_count),
    blank_votes_count: formatNumber(sectionValues.votes_counts.blank_votes_count),
    invalid_votes_count: formatNumber(sectionValues.votes_counts.invalid_votes_count),
    total_votes_cast_count: formatNumber(sectionValues.votes_counts.total_votes_cast_count),
    poll_card_recount: formatNumber(sectionValues.voters_recounts?.poll_card_count),
    proxy_certificate_recount: formatNumber(sectionValues.voters_recounts?.proxy_certificate_count),
    voter_card_recount: formatNumber(sectionValues.voters_recounts?.voter_card_count),
    total_admitted_voters_recount: formatNumber(sectionValues.voters_recounts?.total_admitted_voters_count),
  };

  const [currentValues, setCurrentValues] = React.useState<VotersAndVotesFormValues>(defaultValues);
  const [acceptedWarnings, setAcceptWarnings] = React.useState(false);
  const [warningsWarning, setWarningsWarning] = React.useState(false);

  const { errors, warnings, isSaved, acceptWarnings } = formState.sections.voters_votes_counts;
  const hasChanges = warnings.length > 0 && isSaved && !deepEqual(currentValues, defaultValues);
  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;
  const showAcceptWarnings = errors.length === 0 && warnings.length > 0 && !hasChanges;

  const defaultProps = {
    errorsAndWarnings: isSaved ? getErrorsAndWarnings(errors, warnings) : undefined,
    warningsAccepted: acceptedWarnings,
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const data: VotersAndVotesValues = {
      voters_counts: {
        poll_card_count: deformatNumber(formData.get("poll_card_count")),
        proxy_certificate_count: deformatNumber(formData.get("proxy_certificate_count")),
        voter_card_count: deformatNumber(formData.get("voter_card_count")),
        total_admitted_voters_count: deformatNumber(formData.get("total_admitted_voters_count")),
      },
      votes_counts: {
        votes_candidates_count: deformatNumber(formData.get("votes_candidates_count")),
        blank_votes_count: deformatNumber(formData.get("blank_votes_count")),
        invalid_votes_count: deformatNumber(formData.get("invalid_votes_count")),
        total_votes_cast_count: deformatNumber(formData.get("total_votes_cast_count")),
      },
      voters_recounts: formData.get("poll_card_recount ?")
        ? {
            poll_card_count: deformatNumber(formData.get("poll_card_recount")),
            proxy_certificate_count: deformatNumber(formData.get("proxy_certificate_recount")),
            voter_card_count: deformatNumber(formData.get("voter_card_recount")),
            total_admitted_voters_count: deformatNumber(formData.get("total_admitted_voters_recount")),
          }
        : undefined,
    };

    if (!hasValidationError && hasValidationWarning) {
      if (!hasChanges && !acceptWarnings) {
        setWarningsWarning(true);
      } else {
        await onSubmitForm(data, { acceptWarnings });
      }
    } else {
      await onSubmitForm(data);
    }
  };

  // form keyboard navigation
  const formRef = React.useRef<HTMLFormElement>(null);
  useFormKeyboardNavigation(formRef);

  // scroll to top when saved
  React.useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved, warnings, errors]);

  return {
    formRef,
    onSubmit,
    pollingStationResults,
    currentValues,
    setCurrentValues,
    errors,
    hasValidationError,
    warnings,
    hasValidationWarning,
    isSaving: status === "saving",
    isSaved,
    acceptWarnings,
    setAcceptWarnings,
    showAcceptWarnings,
    warningsWarning,
    defaultProps,
  };
}
