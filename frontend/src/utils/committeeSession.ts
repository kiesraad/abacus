import { hasTranslation, t } from "@/i18n/translate";
import type { CommitteeCategory, CommitteeSession } from "@/types/generated/openapi";

export function committeeSessionLabel(
  committeeCategory: CommitteeCategory,
  sessionNumber: number,
  addArticle = false,
  lowerCase = false,
): string {
  if (committeeCategory === "CSB" || committeeCategory === "HSB") {
    if (lowerCase) {
      return t(`committee_session_status.session.${committeeCategory}_lowercase`);
    }

    return t(`committee_session_status.session.${committeeCategory}`);
  }

  const numberTranslation = `committee_session_status.number.${sessionNumber}`;
  let label: string;
  if (hasTranslation(numberTranslation)) {
    label = `${addArticle ? `${t("committee_session_status.the")} ` : ""}${t(numberTranslation)} ${t(`committee_session_status.session.title`).toLowerCase()}`;
  } else {
    label = `${t("committee_session_status.session.title")} ${sessionNumber}`;
  }

  if (lowerCase) {
    label = label.toLowerCase();
  }

  return label;
}

export function committeeSessionDetailsPresent(committeeSession: CommitteeSession) {
  return (
    committeeSession.start_date_time !== undefined &&
    committeeSession.start_date_time !== "" &&
    committeeSession.location !== ""
  );
}
