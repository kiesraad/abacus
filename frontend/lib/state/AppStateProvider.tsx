import { Component, createContext, ErrorInfo, useReducer } from "react";

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

interface ErrorBoundryProps {
  dispatch: React.Dispatch<AppStateAction>;
  children: React.ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundryProps> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(errorInfo);
    this.props.dispatch({ type: "SET_ERROR", error });
  }

  render() {
    return this.props.children;
  }
}

export function AppStateProvider({ children }: AppStateProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer<(state: AppState, action: AppStateAction) => AppState>(
    appStateReducer,
    DEFAULT_APP_STATE,
  );

  return (
    <ErrorBoundary dispatch={dispatch}>
      <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>
    </ErrorBoundary>
  );
}
