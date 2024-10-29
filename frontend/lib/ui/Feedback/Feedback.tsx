import { ReactElement, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

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
            <h3>Voor alle {type === "error" ? "foutmeldingen" : "waarschuwingen"} geldt het volgende:</h3>
          ) : (
            <></>
          )}
          {feedbackList.length > 1 || !feedbackList[0]?.action ? (
            <ul>
              <li>Heb je iets niet goed overgenomen? Herstel de fout en ga verder.</li>
              {type === "error" ? (
                <li>
                  Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.
                </li>
              ) : (
                <li>Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.</li>
              )}
            </ul>
          ) : (
            feedbackList[0].action
          )}
        </div>
      )}
    </article>
  );
}
