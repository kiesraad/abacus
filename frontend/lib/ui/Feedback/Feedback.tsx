import { ReactNode } from "react";

import { ApiResponseErrorData } from "@kiesraad/api";
import { cn } from "@kiesraad/util";

import { AlertType, FeedbackId } from "../ui.types";
import { renderIconForType } from "../util";
import cls from "./Feedback.module.css";
import { ClientValidationResultCode, FeedbackItem, feedbackTypes } from "./Feedback.types";

export interface FeedbackProps {
  id: FeedbackId;
  type: AlertType;
  data: ClientValidationResultCode[] | ApiResponseErrorData;
  children?: ReactNode;
}

function getFeedbackListFromData(
  data: ClientValidationResultCode[] | ApiResponseErrorData,
): FeedbackItem[] {
  const feedbackList: FeedbackItem[] = [];
  if (Array.isArray(data)) {
    for (const code of data) {
      feedbackList.push(feedbackTypes[code]);
    }
  } else {
    feedbackList.push({
      title: "Server error",
      content: (
        <div>
          {data.errorCode}: {data.message}
        </div>
      ),
    });
  }
  return feedbackList;
}

export function Feedback({ id, type, data, children }: FeedbackProps) {
  const feedbackList = getFeedbackListFromData(data);
  return (
    <article id={id} className={cn(cls.feedback, cls[type])}>
      {feedbackList.map((feedback, index) => (
        <div key={`feedback-${index}`} className="feedback">
          <header>
            {renderIconForType(type)}
            <h3>{feedback.title}</h3>
            {feedback.code && <span>{feedback.code}</span>}
          </header>
          {feedback.content}
        </div>
      ))}
      {id !== "feedback-server-error" && (
        <div className="action">
          {children ? (
            children
          ) : (
            <>
              {feedbackList.length > 1 ? (
                <h3>
                  Voor alle {type === "error" ? "foutmeldingen" : "waarschuwingen"} geldt het
                  volgende:
                </h3>
              ) : (
                <></>
              )}
              <ul>
                <li>Heb je iets niet goed overgenomen? Herstel de fout en ga verder.</li>
                <li>
                  Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan
                  verder.
                </li>
              </ul>
            </>
          )}
        </div>
      )}
    </article>
  );
}
