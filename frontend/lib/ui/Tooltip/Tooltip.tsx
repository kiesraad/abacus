import * as React from "react";
import { createPortal } from "react-dom";
import cls from "./Tooltip.module.css";

export interface TooltipProps {
  children: React.ReactNode;
  anchor: React.RefObject<HTMLElement> | HTMLElement | null;
  closeOnClickOrKeyboardEvent?: boolean;
  onClose?: () => void;
}

export function Tooltip({
  children,
  anchor,
  closeOnClickOrKeyboardEvent,
  onClose,
}: TooltipProps): React.ReactNode {
  const tooltipRoot = document.body;
  const [tooltipStyle, setTooltipStyle] = React.useState<React.CSSProperties | null>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  const handleMouseAndKeyboardEvent = React.useCallback(
    (event: MouseEvent | KeyboardEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        if (onClose) onClose();
        setTooltipStyle(null);
      }
    },
    [onClose],
  );

  React.useEffect(() => {
    if (closeOnClickOrKeyboardEvent) {
      document.addEventListener("mousedown", handleMouseAndKeyboardEvent);
      document.addEventListener("keydown", handleMouseAndKeyboardEvent);
      return () => {
        document.removeEventListener("mousedown", handleMouseAndKeyboardEvent);
        document.removeEventListener("keydown", handleMouseAndKeyboardEvent);
      };
    }
  }, [handleMouseAndKeyboardEvent, closeOnClickOrKeyboardEvent]);

  React.useEffect(() => {
    if (anchor) {
      let el;
      if (anchor instanceof HTMLElement) {
        el = anchor;
      } else if (anchor.current) {
        el = anchor.current;
      }
      if (el) {
        const rect = el.getBoundingClientRect();
        const style: React.CSSProperties = {
          left: rect.left + 8,
          top: rect.bottom + 8,
        };
        setTooltipStyle(style);
      }
    }
  }, [anchor]);

  if (!tooltipStyle) return null;

  return createPortal(
    <div className={cls.tooltip} ref={tooltipRef} role="dialog" style={tooltipStyle}>
      <aside></aside>
      <article>
        <div>!</div>
        {children}
      </article>
    </div>,
    tooltipRoot,
  );
}
