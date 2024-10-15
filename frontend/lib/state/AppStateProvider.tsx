import { createContext, useReducer } from "react";

import { AppState, AppStateAction } from "./AppState.types";
import appStateReducer from "./AppStateReducer";

const DEFAULT_APP_STATE: AppState = {
  error: null,
};

export interface AppStateContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppStateAction>;
}

export const AppStateContext = createContext<AppStateContextValue>({
  state: DEFAULT_APP_STATE,
  dispatch: () => {},
});

export interface AppStateProviderProps {
  children: React.ReactNode;
}

export function AppStateProvider({ children }: AppStateProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer<(state: AppState, action: AppStateAction) => AppState>(
    appStateReducer,
    DEFAULT_APP_STATE,
  );

  return <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>;
}
