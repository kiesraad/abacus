import * as React from "react";

import { deepEqual } from "@/utils";

export function useWatchForChanges<T>(active: boolean, oldValues: T, getNewValues: () => T) {
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    if (active && !hasChanges) {
      const eventHandler = () => {
        if (!deepEqual(oldValues, getNewValues())) {
          document.removeEventListener("keyup", eventHandler);
          setHasChanges(true);
        }
      };

      document.addEventListener("keyup", eventHandler);
      return () => {
        document.removeEventListener("keyup", eventHandler);
      };
    }
  }, [active, hasChanges, oldValues, getNewValues]);

  React.useEffect(() => {
    //if old values changes, activate the listener again
    setHasChanges(false);
  }, [oldValues]);

  return {
    hasChanges,
  };
}
