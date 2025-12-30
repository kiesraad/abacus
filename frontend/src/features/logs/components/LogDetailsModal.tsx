import { Fragment } from "react";

import { Modal } from "@/components/ui/Modal/Modal";
import type { TranslationPath } from "@/i18n/i18n.types";
import { t } from "@/i18n/translate";
import type { AuditEvent, AuditLogEvent } from "@/types/generated/openapi";
import { formatDateTimeFull } from "@/utils/dateTime";

import cls from "./LogsHomePage.module.css";

// whether a value should be translated, and if so, what translation prefix to use
const SHOULD_TRANSLATE: Record<string, string> = {
  role: "",
  reference: "error.api_error.",
  dataEntryStatus: "status.",
  level: "log.level.",
};

// format an audit log event detail value
function formatValue(key: AuditEventDetailKeys, value: AuditEventValues): string {
  if (value === true) {
    return t("yes");
  }

  if (value === false) {
    return t("no");
  }

  if (SHOULD_TRANSLATE[key] === undefined) {
    return value?.toString() || "-";
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return t(`${SHOULD_TRANSLATE[key]}${value}` as TranslationPath);
}

interface LogDetailsModalProps {
  details: AuditLogEvent;
  setDetails: (details: AuditLogEvent | null) => void;
}

type KeysOfUnion<T> = T extends T ? keyof T : never;
type AuditEventDetailKeys = Exclude<KeysOfUnion<AuditEvent>, "event_type">;
type AuditEventValues = string | number | boolean | null;
type AuditEventDetails = {
  [K in AuditEventDetailKeys]: [K, AuditEventValues];
}[AuditEventDetailKeys][];

export function LogDetailsModal({ details, setDetails }: LogDetailsModalProps) {
  const event: AuditEvent = details.event;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const eventDetails = Object.entries(event).filter(([k]) => k !== "event_type") as AuditEventDetails;
  const filteredDetails: [AuditEventDetailKeys, TranslationPath, AuditEventValues][] = eventDetails.map(
    ([k, value]: [AuditEventDetailKeys, AuditEventValues]) => {
      const key: AuditEventDetailKeys = k;
      const translatedKey: TranslationPath = `log.field.${key}`;

      return [key, translatedKey, value];
    },
  );

  return (
    <Modal
      title={t(`log.event.${details.event.event_type}`)}
      onClose={() => {
        setDetails(null);
      }}
    >
      <div>
        <dl className={cls.details} role="list">
          <dt>{t("log.id")}</dt>
          <dd>{details.id}</dd>
          <dt>{t("log.header.time")}</dt>
          <dd>{formatDateTimeFull(new Date(details.time))}</dd>
          {details.username && (
            <>
              <dt>{t("log.field.username")}</dt>
              <dd>{details.username}</dd>
            </>
          )}
          {details.user_fullname && (
            <>
              <dt>{t("log.field.fullname")}</dt>
              <dd>{details.user_fullname || "-"}</dd>
            </>
          )}
          {details.user_role && (
            <>
              <dt>{t("log.field.role")}</dt>
              <dd>{t(details.user_role)}</dd>
            </>
          )}
          {details.user_id && (
            <>
              <dt>{t("log.field.user_id")}</dt>
              <dd>{details.user_id}</dd>
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
              {filteredDetails.map(([key, translationKey, value]) => (
                <Fragment key={key}>
                  <dt>{t(translationKey)}</dt>
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
