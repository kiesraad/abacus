import { Fragment } from "react/jsx-runtime";

import { AuditLogEvent } from "@kiesraad/api";
import { t, TranslationPath } from "@kiesraad/i18n";
import { Modal } from "@kiesraad/ui";
import { formatDateTimeFull } from "@kiesraad/util";

import cls from "./LogsHomePage.module.css";

interface LogDetailsModalProps {
  details: AuditLogEvent;
  setDetails: (details: AuditLogEvent | null) => void;
}

export function LogDetailsModal({ details, setDetails }: LogDetailsModalProps) {
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
          <dt>{t("users.username")}</dt>
          <dd>{details.username}</dd>
          <dt>{t("users.fullname")}</dt>
          <dd>{details.userFullname}</dd>
          <dt>{t("role")}</dt>
          <dd>{t(details.userRole)}</dd>
          <dt>{t("users.id")}</dt>
          <dd>{details.userId}</dd>
          <dt>{t("log.header.message")}</dt>
          <dd>{details.message || "-"}</dd>
          <dt>{t("log.field.ip")}</dt>
          <dd>{details.ip}</dd>
          {Object.entries(details.event)
            .filter(([k]) => k !== "eventType")
            .map(([key, value]) => (
              <Fragment key={key}>
                <dt>{t(`log.field.${key}` as TranslationPath)}</dt>
                <dd>{value}</dd>
              </Fragment>
            ))}
        </dl>
      </div>
    </Modal>
  );
}
