import type { ElectionCategory } from "@/types/generated/openapi";

export function isLocalElection(electionCategory: ElectionCategory): boolean {
  switch (electionCategory) {
    case "Municipal":
      return true;
    case "Provincial":
    case "WaterAuthority":
      return false;
  }
}
