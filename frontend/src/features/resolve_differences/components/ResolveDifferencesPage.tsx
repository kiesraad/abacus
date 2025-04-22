import { politicalGroupsMockData } from "@/testing/api-mocks/ElectionMockData";

import { pollingStationResultsMockData } from "../testing/polling-station-results";
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

// TODO: Implement the actual page layout
export function ResolveDifferencesPage() {
  return (
    <ResolveDifferencesTables
      first={pollingStationResultsMockData(true)}
      second={pollingStationResultsMockData(false)}
      politicalGroups={politicalGroupsMockData}
    />
  );
}
