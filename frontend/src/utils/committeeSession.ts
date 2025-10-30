import { hasTranslation, t } from "@/i18n/translate";

export function committeeSessionLabel(sessionNumber: number, addArticle = false): string {
  console.log("committeeSessionLabel");
  const numberTranslation = `committee_session_status.number.${sessionNumber}`;
  if (hasTranslation(numberTranslation)) {
    return `${addArticle ? `${t("committee_session_status.the")} ` : ""}${t(numberTranslation)} ${t(`committee_session_status.session`).toLowerCase()}`;
  } else {
    return `${t("committee_session_status.session")} ${sessionNumber}`;
  }
}
