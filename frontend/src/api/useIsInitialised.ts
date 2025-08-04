import { useInitialApiGetWithErrors } from "./useInitialApiGet";

export function useIsInitialised(): boolean | undefined {
  const state = useInitialApiGetWithErrors("/api/initialised");

  if (state.requestState.status == "loading") {
    return undefined;
  }

  if (state.requestState.status == "api-error" && state.requestState.error.reference === "NotInitialised") {
    return false;
  }

  return true;
}
