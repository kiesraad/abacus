import { AppState, AppStateAction } from "./AppState.types";

export default function appStateReducer(state: AppState, action: AppStateAction): AppState {
  if (action.type === "SET_ERROR") {
    return {
      ...state,
      error: action.error,
    };
  } else {
    //if (action.type === "CLEAR_ERROR") {
    return {
      ...state,
      error: null,
    };
  }

  return state;
}
