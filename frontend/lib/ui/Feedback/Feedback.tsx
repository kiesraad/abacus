import { forwardRef, ReactNode } from "react";

import { ApiError } from "@kiesraad/api";
import { AlertType, FeedbackId, renderIconForType } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Feedback.module.css";
import { ClientValidationResultCode, FeedbackItem, feedbackTypes } from "./Feedback.types";

interface FeedbackProps {
  id: FeedbackId;
  type: AlertType;
  data?: ClientValidationResultCode[];
  // TODO: #277 move to error page or modal
  apiError?: ApiError;
  children?: ReactNode;
}

export const Feedback = forwardRef<HTMLHeadingElement, FeedbackProps>(({ id, type, data, apiError, children }, ref) => {
  const feedbackList: FeedbackItem[] = [];
  if (data) {
    for (const code of data) {
      feedbackList.push(feedbackTypes[code]);
    }
  }

  return (
    <article id={id} className={cn(cls.feedback, cls[type])}>
      {apiError && (
        <div className="feedback-item">
          <header>
            {renderIconForType(type)}
            <h3 tabIndex={-1} ref={ref}>
              Sorry, er ging iets mis
            </h3>
          </header>
          <div className="content">
            {apiError.code}: {apiError.error}
          </div>
        </div>
      )}
      {feedbackList.map((feedback, index) => (
        <div key={`feedback-${index}`} className="feedback-item">
          <header>
            {renderIconForType(type)}
            <h3 tabIndex={-1} ref={index === 0 ? ref : undefined}>
              {feedback.title}
            </h3>
            {feedback.code && <span>{feedback.code}</span>}
          </header>
          <div className="content">{feedback.content}</div>
        </div>
      ))}
      {(children || feedbackList.length > 0) && (
        <div className="feedback-action">
          {children ? (
            children
          ) : (
            <>
              {feedbackList.length > 1 ? (
                <h3>Voor alle {type === "error" ? "foutmeldingen" : "waarschuwingen"} geldt het volgende:</h3>
              ) : (
                <></>
              )}
              <ul>
                <li>Heb je iets niet goed overgenomen? Herstel de fout en ga verder.</li>
                {type === "error" ? (
                  <li>
                    Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de
                    coördinator.
                  </li>
                ) : (
                  <li>Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.</li>
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </article>
  );
});
