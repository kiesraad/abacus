import { ReactElement, useEffect, useRef } from "react";
import { Link } from "react-router";

import { hasTranslation, t, tx } from "@/i18n/translate";
import { Role, ValidationResultCode } from "@/types/generated/openapi";
import { AlertType, FeedbackId } from "@/types/ui";
import { cn } from "@/utils/classnames";
import { dottedCode } from "@/utils/ValidationResults";

import { AlertIcon } from "../Icon/AlertIcon";
import cls from "./Feedback.module.css";
import { FeedbackItem } from "./Feedback.types";

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
      return {
        title: t(`feedback.${code}.${role}.title`),
        code: dottedCode(code),
        content: hasTranslation(content) ? tx(content, { link }) : undefined,
        action: undefined,
      };
    }) || [];

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
        </div>
      ))}
      {role === "typist" && feedbackList.length > 0 && (
        <div className="feedback-action">
          {feedbackList.length > 1 ? (
            <h3>
              {t("feedback.multiple_action_title", {
                type: type === "error" ? t("feedback.errors") : t("feedback.warnings"),
              })}
            </h3>
          ) : (
            <></>
          )}
          {feedbackList.length > 1 || !feedbackList[0]?.action ? (
            <ul>
              <li>{t("feedback.made_a_mistake")}</li>
              <li>{t("feedback.error_or_warning_remains")}</li>
            </ul>
          ) : (
            feedbackList[0].action
          )}
        </div>
      )}
    </article>
  );
}
