import React from "react";
import { AppLayoutConfig, AppLayoutContext } from "./AppLayout";

export function useAppLayout(config?: Partial<AppLayoutConfig>) {
  const context = React.useContext(AppLayoutContext);
  if (context === null) {
    throw new Error("useAppLayout must be used within an AppLayoutProvider");
  }

  const _config = React.useRef<Partial<AppLayoutConfig>>(context.getConfig());

  React.useEffect(() => {
    if (config && !shallowEqual(_config.current, config)) {
      context.setConfig(config);
      _config.current = config;
    }
  }, [context, config]);

  return context;
}

//TODO: move to util and write tests
function shallowEqual<T extends object>(a: T, b: T) {
  if (a === b) return true;

  const keysA = Object.keys(a) as Array<keyof T>;
  const keysB = Object.keys(b) as Array<keyof T>;

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}
