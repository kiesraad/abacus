import { ReactNode, useEffect, useRef } from "react";

import { hasTranslation, t, tx } from "@/i18n/translate";
import { Role, ValidationResult } from "@/types/generated/openapi";
import { AlertType, FeedbackId } from "@/types/ui";
import { cn } from "@/utils/classnames";
import { dottedCode } from "@/utils/ValidationResults";

import { AlertIcon } from "../Icon/AlertIcon";
import cls from "./Feedback.module.css";

interface FeedbackItem {
  title: string;
  codes: string[];
  content?: ReactNode;
  actions?: ReactNode;
}

interface FeedbackProps {
  id: FeedbackId;
  type: AlertType;
  data: ValidationResult[];
  userRole: Role;
  shouldFocus?: boolean;
}

export function Feedback({ id, type, data, userRole, shouldFocus = true }: FeedbackProps) {
  const feedbackHeader = useRef<HTMLHeadingElement | null>(null);
  // NOTE: administrator roles are always mapped to coordinator here
  const role = userRole === "administrator" ? "coordinator" : userRole;
  const feedbackList: FeedbackItem[] = [];
  for (const { code, context } of data) {
    const title = t(`feedback.${code}.${role}.title`, { ...context });
    const contentPath = `feedback.${code}.${role}.content`;
    const actionsPath = `feedback.${code}.${role}.actions`;
    const content = hasTranslation(contentPath) ? tx(contentPath, undefined, { ...context }) : undefined;
    const actions = hasTranslation(actionsPath) ? tx(actionsPath, undefined, { ...context }) : undefined;

    const identical = feedbackList.find(
      (item) => item.title === title && item.content === content && item.actions === actions,
    );

    if (identical) {
      identical.codes.push(dottedCode(code));
    } else {
      feedbackList.push({
        title,
        codes: [dottedCode(code)],
        content,
        actions,
      });
    }
  }

  const actionsGrouped = role === "typist" && feedbackList.every((item) => item.actions === undefined);
  const defaultActions = tx(`feedback.${role}_actions`);

  useEffect(() => {
    if (shouldFocus) {
      feedbackHeader.current?.focus();
    }
  }, [data, shouldFocus]);

  return (
    <article id={id} className={cn(cls.feedback, cls[type])}>
      {feedbackList.map((feedback, index) => (
        <div key={`feedback-${feedback.codes.join("-")}`} className={cls.item}>
          <header>
            <AlertIcon type={type} />
            <h3 tabIndex={-1} ref={index === 0 ? feedbackHeader : undefined} className="feedback-header">
              {feedback.title}
            </h3>
            <span>{feedback.codes.join(", ")}</span>
          </header>
          {feedback.content && <div className={cls.content}>{feedback.content}</div>}
          {!actionsGrouped && <div className={cls.actions}>{feedback.actions ?? defaultActions}</div>}
        </div>
      ))}
      {actionsGrouped && (
        <div className={cls.actions}>
          {feedbackList.length > 1 && (
            <h3>
              {t("feedback.multiple_action_title", {
                type: type === "error" ? t("feedback.errors") : t("feedback.warnings"),
              })}
            </h3>
          )}
          {tx(`feedback.${role}_actions`)}
        </div>
      )}
    </article>
  );
}
