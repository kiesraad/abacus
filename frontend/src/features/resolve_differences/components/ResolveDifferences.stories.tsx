import { Story } from "@ladle/react";

import { politicalGroupsMockData } from "@/testing/api-mocks";

import { pollingStationResultsMockData } from "../testing/polling-station-results";
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
