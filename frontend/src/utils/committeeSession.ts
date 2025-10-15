import { t } from "@/i18n/translate";

const isTranslatableSessionNumber = (num: number): num is 1 | 2 | 3 | 4 | 5 => num >= 1 && num <= 5;

export function committeeSessionLabel(sessionNumber: number, addArticle = false): string {
  if (isTranslatableSessionNumber(sessionNumber)) {
    return `${addArticle ? `${t("committee_session_status.the")} ` : ""}${t(`committee_session_status.number.${sessionNumber}`)} ${t(`committee_session_status.session`).toLowerCase()}`;
  } else {
    return `${t("committee_session_status.session")} ${sessionNumber}`;
  }
}
