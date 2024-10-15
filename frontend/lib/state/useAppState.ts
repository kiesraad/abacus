import { useContext } from "react";

import { AppStateContext, AppStateContextValue } from "./AppStateProvider";

export default function useAppState(): AppStateContextValue {
  return useContext(AppStateContext);
}
