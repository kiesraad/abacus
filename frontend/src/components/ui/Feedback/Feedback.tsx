import { type ReactNode, useEffect, useRef } from "react";

import { t, tx } from "@/i18n/translate";
import type { Election, Role, ValidationResult } from "@/types/generated/openapi";
import type { AlertType, FeedbackId } from "@/types/ui";
import { cn } from "@/utils/classnames";
import { isAdministrator, isCoordinator, isTypist } from "@/utils/role";
import { getTranslations } from "@/utils/ValidationResults";
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
  validationResults: ValidationResult[];
  election: Election;
  userRole: Role;
  shouldFocus?: boolean;
}

export function Feedback({ id, type, election, validationResults, userRole, shouldFocus = true }: FeedbackProps) {
  const feedbackHeader = useRef<HTMLHeadingElement | null>(null);

  // NOTE: Administrators get the same feedback messages as the coordinator
  const role = isAdministrator(userRole) || isCoordinator(userRole) ? "coordinator" : "typist";

  const feedbackList: FeedbackItem[] = [];
  for (const result of validationResults) {
    const { code, title, content, actions } = getTranslations(election, result, role);

    const identical = feedbackList.find(
      (item) => item.title === title && item.content === content && item.actions === actions,
    );

    if (identical) {
      identical.codes.push(code);
    } else {
      feedbackList.push({ title, codes: [code], content, actions });
    }
  }

  const actionsGrouped = role === "typist" && feedbackList.every((item) => item.actions === undefined);
  // Only show default actions for typists (all feedback types, all categories) and coordinators (error, GSB only).
  const defaultActions =
    isTypist(userRole) || (role === "coordinator" && type === "error" && election.committee_category === "GSB")
      ? tx(`feedback.${role}_actions`)
      : undefined;

  useEffect(() => {
    if (shouldFocus) {
      feedbackHeader.current?.focus();
    }
  }, [shouldFocus]);

  return (
    <article id={id} className={cn(cls.feedback, cls[type])}>
      {feedbackList.map((feedback, index) => {
        const actions = feedback.actions ?? defaultActions;

        return (
          <div key={`feedback-${feedback.codes.join("-")}`} className={cls.item}>
            <header>
              <AlertIcon type={type} />
              <h3 tabIndex={-1} ref={index === 0 ? feedbackHeader : undefined} className="feedback-header">
                {feedback.title}
              </h3>
              <span>{feedback.codes.join(", ")}</span>
            </header>
            {feedback.content && <div className={cls.content}>{feedback.content}</div>}
            {!actionsGrouped && actions !== undefined && <div className={cls.actions}>{actions}</div>}
          </div>
        );
      })}
      {actionsGrouped && defaultActions && (
        <div className={cls.actions}>
          {feedbackList.length > 1 && (
            <h3>
              {t("feedback.multiple_action_title", {
                type: type === "error" ? t("feedback.errors") : t("feedback.warnings"),
              })}
            </h3>
          )}
          {defaultActions}
        </div>
      )}
    </article>
  );
}
