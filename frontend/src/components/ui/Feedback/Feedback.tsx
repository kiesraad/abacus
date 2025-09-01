import { ReactElement, ReactNode, useEffect, useRef } from "react";
import { Link } from "react-router";

import { hasTranslation, t, tx } from "@/i18n/translate";
import { Role, ValidationResultCode } from "@/types/generated/openapi";
import { AlertType, FeedbackId } from "@/types/ui";
import { cn } from "@/utils/classnames";
import { dottedCode } from "@/utils/ValidationResults";

import { AlertIcon } from "../Icon/AlertIcon";
import cls from "./Feedback.module.css";

interface FeedbackItem {
  title: string;
  code?: string;
  content?: ReactNode;
  actions?: ReactNode;
}

interface FeedbackProps {
  id: FeedbackId;
  type: AlertType;
  data?: ValidationResultCode[];
  userRole: Role;
  shouldFocus?: boolean;
}

export function Feedback({ id, type, data, userRole, shouldFocus = true }: FeedbackProps) {
  const feedbackHeader = useRef<HTMLHeadingElement | null>(null);
  const link = (children: ReactElement) => <Link to={`../voters-and-votes`}>{children}</Link>;
  // NOTE: administrator roles are always mapped to coordinator here
  const role = userRole === "administrator" ? "coordinator" : userRole;
  const feedbackList: FeedbackItem[] =
    data?.map((code: ValidationResultCode): FeedbackItem => {
      const content = `feedback.${code}.${role}.content`;
      const actions = `feedback.${code}.${role}.actions`;
      return {
        title: t(`feedback.${code}.${role}.title`),
        code: dottedCode(code),
        content: hasTranslation(content) ? tx(content, { link }) : undefined,
        actions: hasTranslation(actions) ? tx(actions) : undefined,
      };
    }) || [];

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
        <div key={`feedback-${index}`} className="feedback-item">
          <header>
            <AlertIcon type={type} />
            <h3 tabIndex={-1} ref={index === 0 ? feedbackHeader : undefined} className="feedback-header">
              {feedback.title}
            </h3>
            {feedback.code && <span>{feedback.code}</span>}
          </header>
          {feedback.content && <div className="content">{feedback.content}</div>}
          {!actionsGrouped && <div className="feedback-action">{feedback.actions ?? defaultActions}</div>}
        </div>
      ))}
      {actionsGrouped && (
        <div className="feedback-action">
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
