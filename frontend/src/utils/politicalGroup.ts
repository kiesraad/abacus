import { t } from "@/i18n/translate";
import type { PoliticalGroup } from "@/types/generated/openapi";

/**
 * Formats a political group name for display. Optionally with political group number prefix.
 * withPrefix=true: "Lijst {number} - {name}"
 * withPrefix=false: "{name}"
 */
export function formatPoliticalGroupName(politicalGroup: PoliticalGroup | undefined, withPrefix = true): string {
  if (politicalGroup) {
    return getPoliticalGroupName(politicalGroup.number, politicalGroup.name, withPrefix);
  } else {
    return "";
  }
}

export function getPoliticalGroupName(number: number, name: string, withPrefix = true): string {
  let listPrefix = "";
  if (withPrefix) {
    listPrefix += `${t("list")} ${number} - `;
  }
  return `${listPrefix}${name}`;
}
