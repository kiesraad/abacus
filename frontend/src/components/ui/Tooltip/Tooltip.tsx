import * as React from "react";

import cls from "./Tooltip.module.css";

export interface TooltipProps {
  children: React.ReactNode;
  content?: React.ReactNode;
  onClose: () => void;
}

export function Tooltip({ children, content, onClose }: TooltipProps): React.ReactNode {
  React.useEffect(() => {
    document.addEventListener("mousedown", onClose);
    document.addEventListener("keydown", onClose);
    return () => {
      document.removeEventListener("mousedown", onClose);
      document.removeEventListener("keydown", onClose);
    };
  }, [onClose]);

  return (
    <div className={cls.container}>
      {children}
      {content && (
        <div className={cls.tooltip} role="dialog">
          {content}
        </div>
      )}
    </div>
  );
}
