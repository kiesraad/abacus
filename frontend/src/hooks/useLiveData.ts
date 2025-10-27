import { useEffect } from "react";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";

// Hook to refetch live data at regular intervals and on tab visibility change
export function useLiveData(refetchFunctions: Array<(abortController: AbortController) => Promise<unknown>>) {
  useEffect(() => {
    const abortController = new AbortController();

    const refetch = () => {
      // only refetch if the document is hidden (i.e., user is on another tab)
      if (!document.hidden) {
        refetchFunctions.forEach((refetchFunction) => {
          void refetchFunction(abortController);
        });
      }
    };

    // set up periodic refetching every 30 seconds
    const refetchInterval = setInterval(refetch, 30_000);

    // add visibility change listener to refetch when tab becomes active
    document.addEventListener("visibilitychange", refetch);

    return () => {
      // cancel any ongoing requests
      abortController.abort(DEFAULT_CANCEL_REASON);
      // clean up event listener
      document.removeEventListener("visibilitychange", refetch);
      // clear up the interval
      clearInterval(refetchInterval);
    };
  }, [refetchFunctions]);
}
