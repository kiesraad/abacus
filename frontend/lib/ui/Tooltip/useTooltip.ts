import * as React from "react";
import { domtoren } from "@kiesraad/util";

/** Tooltip MVP version
 * todo:
 * - position and size based on screen position and size
 * - close on click outside
 * - dynamic icon
 */

export interface TooltipConfig {
  anchor: HTMLElement;
  position: "top" | "bottom" | "left" | "right";
  type?: "info" | "warning" | "error";
  html: string;
}

export interface UseTooltipReturn {
  show: (config: TooltipConfig) => void;
  hide: () => void;
}

export function useTooltip(): UseTooltipReturn {
  const tooltipRootEl: HTMLElement | null = React.useMemo(() => {
    return document.getElementById("tooltip");
  }, []);

  if (!tooltipRootEl) {
    throw new Error("Tooltip root element not found");
  }

  const show = React.useCallback(
    (config: TooltipConfig) => {
      const rect = config.anchor.getBoundingClientRect();
      const left = rect.left + 8;
      const top = rect.bottom + 8;
      domtoren(tooltipRootEl).show().left(left).top(top).first("p").html(config.html);
    },
    [tooltipRootEl],
  );

  const hide = React.useCallback(() => {
    domtoren(tooltipRootEl).hide();
  }, [tooltipRootEl]);

  return {
    show,
    hide,
  };
}
