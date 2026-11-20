import { t } from "@/i18n/translate";
import type { CommitteeCategory, CommitteeDistrict, Election, ElectionCategory } from "@/types/generated/openapi";

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
  let prefix = "";
  if (category) {
    switch (category) {
      // TODO: For HSB, add switch case and make sure prefix is `${category} Kieskring `
      case "GSB":
      case "CSB":
        prefix += `${category} `;
    }
  }
  return `${prefix}${authority_id} - ${authority_name}`;
}

export function getCommitteeTypeLabel(election: Election) {
  switch (election.committee_category) {
    // TODO: For HSB, add switch case with same formatting as CSB`
    case "GSB":
      return `${election.committee_category} ${election.authority_id} ${election.authority_name}`;
    case "CSB":
      return `${election.committee_category} ${election.authority_name}`;
  }
}
