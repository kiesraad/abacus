import type { Meta, StoryFn } from "@storybook/react-vite";

import { pollingStationRequestMockData } from "@/testing/api-mocks/PollingStationRequestMockData";

import { PollingStationsPreview } from "./PollingStationsPreview";

export const DefaultPollingStationsPreview: StoryFn = () => {
  return <PollingStationsPreview pollingStations={pollingStationRequestMockData} />;
};

export default {} satisfies Meta;
