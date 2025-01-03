import { ReactElement, useEffect, useRef } from "react";
import { Link } from "react-router";

import { t, tx } from "@kiesraad/i18n";
import { AlertType, FeedbackId, renderIconForType } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Feedback.module.css";
import { ClientValidationResultCode, FeedbackItem } from "./Feedback.types";

interface FeedbackProps {
  id: FeedbackId;
  type: AlertType;
  data?: ClientValidationResultCode[];
}

export function Feedback({ id, type, data }: FeedbackProps) {
  const feedbackHeader = useRef<HTMLHeadingElement | null>(null);
  const link = (children: ReactElement) => <Link to={`../voters-and-votes`}>{children}</Link>;

  const feedbackList: FeedbackItem[] =
    data?.map(
      (code: ClientValidationResultCode): FeedbackItem => ({
        title: t(`feedback.${code}.title`),
        code: `${code[0]}.${code.slice(1)}`,
        content: tx(`feedback.${code}.content`, { link }),
        action: code == "F101" ? tx(`feedback.F101.action`, {}) : undefined,
      }),
    ) || [];

  useEffect(() => {
    feedbackHeader.current?.focus();
  }, []);

  return (
    <article id={id} className={cn(cls.feedback, cls[type])}>
      {feedbackList.map((feedback, index) => (
        <div key={`feedback-${index}`} className="feedback-item">
          <header>
            {renderIconForType(type)}
            <h3 tabIndex={-1} ref={index === 0 ? feedbackHeader : undefined} className="feedback-header">
              {feedback.title}
            </h3>
            {feedback.code && <span>{feedback.code}</span>}
          </header>
          <div className="content">{feedback.content}</div>
        </div>
      ))}
      {feedbackList.length > 0 && (
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
              {type === "error" ? <li>{t("feedback.error_remains")}</li> : <li>{t("feedback.warning_remains")}</li>}
            </ul>
          ) : (
            feedbackList[0].action
          )}
        </div>
      )}
    </article>
  );
}
