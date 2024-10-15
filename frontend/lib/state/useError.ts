import { useContext } from "react";

import { AppError } from "./AppState.types";
import { AppStateContext } from "./AppStateProvider";

export function useError() {
  const { state, dispatch } = useContext(AppStateContext);

  return {
    error: state.error,
    setError: (error: AppError) => {
      dispatch({ type: "SET_ERROR", error });
    },
    clearError: () => {
      dispatch({ type: "CLEAR_ERROR" });
    },
  };
}
