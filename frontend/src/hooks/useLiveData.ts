import { useEffect } from "react";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";

// Hook to refetch live data at regular intervals and on tab visibility change
export function useLiveData(
  refetchFunction: (abortController: AbortController) => Promise<unknown>,
  initialRefetch: boolean = false,
) {
  useEffect(() => {
    const abortController = new AbortController();

    const refetch = () => {
      // don't refetch if the document is hidden (i.e., user is on another tab)
      if (!document.hidden) {
        void refetchFunction(abortController);
      }
    };

    // set up periodic refetching every 30 seconds
    const refetchInterval = setInterval(refetch, 30_000);

    // add visibility change listener to refetch when tab becomes active
    document.addEventListener("visibilitychange", refetch);

    if (initialRefetch) {
      refetch();
    }

    return () => {
      // cancel any ongoing requests
      abortController.abort(DEFAULT_CANCEL_REASON);
      // clean up event listener
      document.removeEventListener("visibilitychange", refetch);
      // clear up the interval
      clearInterval(refetchInterval);
    };
  }, [refetchFunction, initialRefetch]);
}
