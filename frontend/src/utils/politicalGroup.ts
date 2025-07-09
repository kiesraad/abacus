import { t } from "@/i18n/translate";
import type { PoliticalGroup } from "@/types/generated/openapi";

/**
 * Formats a political group name for display.
 * For named groups: "Lijst {number} - {name}"
 * For unnamed groups: "Lijst {number}"
 */
export function formatPoliticalGroupName(politicalGroup: PoliticalGroup): string {
  const listPrefix = `${t("list")} ${politicalGroup.number}`;

  if (politicalGroup.name === "") {
    return listPrefix;
  } else {
    return `${listPrefix} - ${politicalGroup.name}`;
  }
}
