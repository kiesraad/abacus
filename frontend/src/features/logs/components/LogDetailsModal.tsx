import { Fragment } from "react/jsx-runtime";

import { AuditLogEvent } from "@kiesraad/api";
import { hasTranslation, t, TranslationPath } from "@kiesraad/i18n";
import { Modal } from "@kiesraad/ui";
import { formatDateTimeFull } from "@kiesraad/util";

import cls from "./LogsHomePage.module.css";

// field valuas that should be translated
const SHOULD_TRANSLATE = ["role"];

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
              {filteredDetails.map(([key, value]) => (
                <Fragment key={key}>
                  <dt>{t(`log.field.${key}` as TranslationPath)}</dt>
                  <dd>{SHOULD_TRANSLATE.includes(key) ? t(value as TranslationPath) : value || "-"}</dd>
                </Fragment>
              ))}
            </dl>
          </>
        )}
      </div>
    </Modal>
  );
}
