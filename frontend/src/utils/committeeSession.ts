import { hasTranslation, t } from "@/i18n/translate";
import type { CommitteeCategory } from "@/types/generated/openapi.ts";

export function committeeSessionLabel(
  committeeCategory: CommitteeCategory,
  sessionNumber: number,
  addArticle = false,
  lowerCase = false,
): string {
  if (committeeCategory === "CSB") {
    if (lowerCase) {
      return t("committee_session_status.session_CSB_lowercase");
    }

    return t("committee_session_status.session_CSB");
  }

  const numberTranslation = `committee_session_status.number.${sessionNumber}`;
  let label: string;
  if (hasTranslation(numberTranslation)) {
    label = `${addArticle ? `${t("committee_session_status.the")} ` : ""}${t(numberTranslation)} ${t(`committee_session_status.session`).toLowerCase()}`;
  } else {
    label = `${t("committee_session_status.session")} ${sessionNumber}`;
  }

  if (lowerCase) {
    label = label.toLowerCase();
  }

  return label;
}
