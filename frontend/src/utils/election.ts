import { t } from "@/i18n/translate";
import type { CommitteeDistrict, ElectionCategory, SubCommitteeFirstSession } from "@/types/generated/openapi";

export function isLocalElection(electionCategory: ElectionCategory): boolean {
  switch (electionCategory) {
    case "Municipal":
      return true;
    case "HouseOfRepresentatives":
    case "Provincial":
    case "WaterAuthority":
      return false;
  }
}

export function getDistrictNumber(district: Extract<CommitteeDistrict, { district: "Specific" }>) {
  if (!district.key.number) {
    return "";
  }
  if (district.roman_numerals) {
    switch (district.key.number) {
      case 1:
        return "I";
      case 2:
        return "II";
      default:
        // There are no districts with roman numerals higher than 2
        return "";
    }
  } else {
    return district.key.number;
  }
}

export function getDistrictLabel(
  district: Extract<CommitteeDistrict, { district: "Specific" }>,
  withDistrictPrefix: boolean = false,
) {
  let prefix = "";
  if (withDistrictPrefix) {
    prefix += `${t("election.district")} `;
  }
  const districtNumber = getDistrictNumber(district);
  if (districtNumber !== "") {
    prefix += `${districtNumber} - `;
  }
  return `${prefix}${district.name}`;
}

export function getAreaDesignation(subCommittee: SubCommitteeFirstSession, withCategoryPrefix: boolean = false) {
  let prefix = "";
  if (withCategoryPrefix) {
    prefix += `${subCommittee.category} `;
  }
  return `${prefix}${subCommittee.authority_id} - ${subCommittee.authority_name}`;
}
