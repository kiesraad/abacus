import { Fragment } from "react/jsx-runtime";

import { AuditLogEvent } from "@kiesraad/api";
import { hasTranslation, t, TranslationPath } from "@kiesraad/i18n";
import { Modal } from "@kiesraad/ui";
import { formatDateTimeFull } from "@kiesraad/util";

import cls from "./LogsHomePage.module.css";

// whether a value should be translated, and if so, what translation prefix to use
const SHOULD_TRANSLATE: Record<string, string> = {
  role: "",
  reference: "error.api_error.",
  dataEntryStatus: "status.",
};

// format an audit log event detail value
function formatValue(key: string, value: string) {
  if (SHOULD_TRANSLATE[key] === undefined) {
    return value || "-";
  }

  return t(`${SHOULD_TRANSLATE[key]}${value}` as TranslationPath);
}

interface LogDetailsModalProps {
  details: AuditLogEvent;
  setDetails: (details: AuditLogEvent | null) => void;
}

export function LogDetailsModal({ details, setDetails }: LogDetailsModalProps) {
  const filteredDetails = Object.entries(details.event).filter(
    ([k]) => k !== "eventType" && hasTranslation(`log.field.${k}`),
  );

  return (
    <Modal
      title={t(`log.event.${details.event.eventType}`)}
      onClose={() => {
        setDetails(null);
      }}
    >
      <div>
        <dl className={cls.details} role="list">
          <dt>{t("log.header.time")}</dt>
          <dd>{formatDateTimeFull(new Date(details.time))}</dd>
          <dt>{t("log.field.username")}</dt>
          <dd>{details.username}</dd>
          <dt>{t("log.field.fullname")}</dt>
          <dd>{details.userFullname || "-"}</dd>
          <dt>{t("log.field.role")}</dt>
          <dd>{t(details.userRole)}</dd>
          <dt>{t("log.field.user_id")}</dt>
          <dd>{details.userId}</dd>
          <dt>{t("log.header.message")}</dt>
          <dd>{details.message || "-"}</dd>
          <dt>{t("log.field.ip")}</dt>
          <dd>{details.ip}</dd>
        </dl>
        {filteredDetails.length > 0 && (
          <>
            <h3>{t("log.header.details")}</h3>
            <dl className={cls.details} role="list">
              {filteredDetails.map(([key, value]: [string, string]) => (
                <Fragment key={key}>
                  <dt>{t(`log.field.${key}` as TranslationPath)}</dt>
                  <dd>{formatValue(key, value)}</dd>
                </Fragment>
              ))}
            </dl>
          </>
        )}
      </div>
    </Modal>
  );
}
