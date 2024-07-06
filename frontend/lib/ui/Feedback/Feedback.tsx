import * as React from "react";
import cls from "./Feedback.module.css";
import { AlertType } from "../ui.types";
import { cn } from "@kiesraad/util";
import { renderIconForType } from "../util/Util";

export interface FeedbackProps {
  type: AlertType;
  title: string;
  code?: string;
  children: React.ReactNode;
}

export function Feedback({ type, title, code, children }: FeedbackProps) {
  return (
    <article className={cn(cls.feedback, cls[type])}>
      <header>
        {renderIconForType(type)}
        <h3>{title}</h3>
        {code && <span>{code}</span>}
      </header>
      {children}
    </article>
  );
}
