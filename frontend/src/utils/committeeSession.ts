import { hasTranslation, t } from "@/i18n/translate";
import type { ElectionRole } from "@/types/generated/openapi.ts";

export function committeeSessionLabel(role: ElectionRole, sessionNumber: number, addArticle = false): string {
  if (role === "CSB") {
    return t("committee_session_status.session_CSB");
  }

  const numberTranslation = `committee_session_status.number.${sessionNumber}`;
  if (hasTranslation(numberTranslation)) {
    return `${addArticle ? `${t("committee_session_status.the")} ` : ""}${t(numberTranslation)} ${t(`committee_session_status.session`).toLowerCase()}`;
  } else {
    return `${t("committee_session_status.session")} ${sessionNumber}`;
  }
}
