import { Fragment } from "react";

import { Modal } from "@/components/ui/Modal/Modal";
import { TranslationPath } from "@/i18n/i18n.types";
import { hasTranslation, t } from "@/i18n/translate";
import { AuditLogEvent } from "@/types/generated/openapi";
import { formatDateTimeFull } from "@/utils/format";

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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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
          {details.username && (
            <>
              <dt>{t("log.field.username")}</dt>
              <dd>{details.username}</dd>
            </>
          )}
          {details.userFullname && (
            <>
              <dt>{t("log.field.fullname")}</dt>
              <dd>{details.userFullname || "-"}</dd>
            </>
          )}
          {details.userRole && (
            <>
              <dt>{t("log.field.role")}</dt>
              <dd>{details.userRole}</dd>
            </>
          )}
          {details.userId && (
            <>
              <dt>{t("log.field.user_id")}</dt>
              <dd>{details.userId}</dd>
            </>
          )}
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
                  <dt>
                    {
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
                      t(`log.field.${key}` as TranslationPath)
                    }
                  </dt>
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
