import { Story } from "@ladle/react";

import { pollingStationResultsMockData } from "@/features/resolve_differences/testing/polling-station-results";
import { politicalGroupsMockData } from "@/testing/api-mocks";

import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

export default {
  title: "App / Resolve Differences",
};

export const DefaultResolveDifferencesTables: Story = () => (
  <ResolveDifferencesTables
    first={pollingStationResultsMockData(true)}
    second={pollingStationResultsMockData(false)}
    politicalGroups={politicalGroupsMockData}
  />
);
DefaultResolveDifferencesTables.storyName = "ResolveDifferencesTables";
