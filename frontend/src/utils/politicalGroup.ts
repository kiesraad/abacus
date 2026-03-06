import { t } from "@/i18n/translate";
import type { PoliticalGroup } from "@/types/generated/openapi";

/**
 * Formats a political group name for display.
 * For named groups: "Lijst {number} - {name}"
 * For unnamed groups: "Lijst {number}"
 */
export function formatPoliticalGroupName(politicalGroup: PoliticalGroup): string {
  return getPoliticalGroupName(politicalGroup.number, politicalGroup.name);
}

export function getPoliticalGroupName(number: number, name: string): string {
  const listPrefix = `${t("list")} ${number}`;

  if (name === "") {
    return listPrefix;
  } else {
    return `${listPrefix} - ${name}`;
  }
}
