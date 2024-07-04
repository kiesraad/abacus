import * as React from "react";
import cls from "./Tooltip.module.css";

export interface TooltipProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  onClose?: () => void;
}

export const EVENT_TOOLTIP_HIDE = "tooltiphide";
const hideEvent = new CustomEvent(EVENT_TOOLTIP_HIDE);

export function Tooltip({ children, content, onClose }: TooltipProps): React.ReactNode {
  const [visible, setVisible] = React.useState(true);

  const handleMouseAndKeyboardEvent = React.useCallback(() => {
    if (onClose) onClose();
    setVisible(false);
    window.dispatchEvent(hideEvent);
  }, [onClose]);

  React.useEffect(() => {
    document.addEventListener("mousedown", handleMouseAndKeyboardEvent);
    document.addEventListener("keydown", handleMouseAndKeyboardEvent);
    return () => {
      document.removeEventListener("mousedown", handleMouseAndKeyboardEvent);
      document.removeEventListener("keydown", handleMouseAndKeyboardEvent);
    };
  }, [handleMouseAndKeyboardEvent]);

  if (!visible) return children;
  return (
    <div className={cls.container}>
      {children}
      <div className={cls.tooltip} role="dialog">
        <aside></aside>
        <article>{content}</article>
      </div>
    </div>
  );
}
