import type { CommitteeDistrict, ElectionCategory } from "@/types/generated/openapi";

export function isLocalElection(electionCategory: ElectionCategory): boolean {
  switch (electionCategory) {
    case "Municipal":
      return true;
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
