import { t } from "@/i18n/translate";

export function committeeSessionLabel(sessionNumber: number): string {
  const sessionString = sessionNumber.toString();
  if (
    sessionString === "1" ||
    sessionString === "2" ||
    sessionString === "3" ||
    sessionString === "4" ||
    sessionString === "5"
  ) {
    return `${t(`committee_session_status.number.${sessionString}`)} ${t(`committee_session_status.session`).toLowerCase()}`;
  } else {
    return `${t("committee_session_status.session")} ${sessionString}`;
  }
}
