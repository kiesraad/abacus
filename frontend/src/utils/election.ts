import { t } from "@/i18n/translate";
import type { CommitteeCategory, CommitteeDistrict, ElectionCategory } from "@/types/generated/openapi";

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

export function formatAreaDesignation(authority_id: string, authority_name: string, category?: CommitteeCategory) {
  switch (category) {
    case "GSB":
    case "CSB":
      return `${category} ${authority_id} - ${authority_name}`;
    case "HSB":
      return `${category} ${t("election.district")} ${authority_id} - ${authority_name}`;
    default:
      return `${authority_id} - ${authority_name}`;
  }
}

export function formatElectionTypeLabel(authority_id: string, authority_name: string, category: CommitteeCategory) {
  switch (category) {
    case "GSB":
      return `${category} ${authority_id} ${authority_name}`;
    case "CSB":
    case "HSB":
      return `${category} ${authority_name}`;
  }
}
