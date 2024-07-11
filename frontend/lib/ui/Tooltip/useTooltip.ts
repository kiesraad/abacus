import * as React from "react";
import { EVENT_TOOLTIP_HIDE } from "./Tooltip";

export interface UseTooltipParams {
  onDismiss?: () => void;
}

export function useTooltip({ onDismiss }: UseTooltipParams) {
  React.useEffect(() => {
    const handler = () => {
      if (onDismiss) {
        onDismiss();
      }
    };

    window.addEventListener(EVENT_TOOLTIP_HIDE, handler);

    return () => {
      window.removeEventListener(EVENT_TOOLTIP_HIDE, handler);
    };
  }, [onDismiss]);
}
