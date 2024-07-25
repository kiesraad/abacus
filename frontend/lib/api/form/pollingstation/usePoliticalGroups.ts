import * as React from "react";

import { PoliticalGroupVotes, usePollingStationFormController } from "@kiesraad/api";

export function usePoliticalGroup(
  political_group_number: number,
  getValues: () => PoliticalGroupVotes,
) {
  const {
    values,
    formState,
    loading,
    error: serverError,
    setTemporaryCache,
    cache,
    registerCurrentForm,
    submitCurrentForm,
  } = usePollingStationFormController();

  const sectionValues = React.useMemo(() => {
    if (cache && cache.key === "political_group_votes" && cache.id === political_group_number) {
      const data = cache.data;
      setTemporaryCache(null);
      return data;
    }
    return values.political_group_votes.find((pg) => pg.number === political_group_number);
  }, [values, political_group_number, setTemporaryCache, cache]);

  // const setSectionValues = (values: PoliticalGroupVotes) => {
  //   setValues((old) => ({
  //     ...old,
  //     political_group_votes: old.political_group_votes.map((pg) => {
  //       if (pg.number === political_group_number) {
  //         return values;
  //       }
  //       return pg;
  //     }),
  //   }));
  // };

  // //TODO: this does not what I want.
  // const _getValues = React.useCallback(() => {
  //   const newValues = getValues();
  //   return {
  //     political_group_votes: values.political_group_votes.map((pg) => {
  //       if (pg.number === political_group_number) {
  //         return newValues;
  //       }
  //       return pg;
  //     }),
  //   };
  // }, [values, political_group_number, getValues]);

  const errors = React.useMemo(() => {
    return formState.sections[`political_group_votes_${political_group_number}`]?.errors || [];
  }, [formState, political_group_number]);

  const warnings = React.useMemo(() => {
    return formState.sections[`political_group_votes_${political_group_number}`]?.warnings || [];
  }, [formState, political_group_number]);

  registerCurrentForm({
    type: "political_group_votes",
    id: `political_group_votes_${political_group_number}`,
    number: political_group_number,
    getValues,
  });

  return {
    sectionValues,
    errors,
    warnings,
    loading,
    isCalled:
      formState.sections[`political_group_votes_${political_group_number}`]?.isCalled || false,
    serverError,
    setTemporaryCache,
    submit: submitCurrentForm,
  };
}
