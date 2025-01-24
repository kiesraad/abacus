import type { Story } from "@ladle/react";

import { ElectionStatus } from "./ElectionStatus";
import { mockElection, mockPollingStations } from "./mockData";

interface StoryProps {
  navigate: (path: string) => void;
}

export const PollingStationStatus: Story<StoryProps> = ({ navigate }) => (
  <ElectionStatus
    statuses={[
      {
        polling_station_id: 1,
        status: "first_entry_not_started",
      },
      {
        polling_station_id: 2,
        status: "second_entry_not_started",
        finished_at: new Date().toISOString(),
      },
      {
        polling_station_id: 3,
        status: "first_entry_in_progress",
        first_data_entry_progress: 60,
      },
      {
        polling_station_id: 4,
        status: "first_entry_in_progress",
        first_data_entry_progress: 40,
      },
    ]}
    election={mockElection}
    pollingStations={mockPollingStations}
    navigate={navigate}
  />
);

export const Empty: Story<StoryProps> = ({ navigate }) => (
  <ElectionStatus statuses={[]} election={mockElection} pollingStations={[]} navigate={navigate} />
);

export const InProgress: Story<StoryProps> = ({ navigate }) => (
  <ElectionStatus
    statuses={[
      {
        polling_station_id: 1,
        status: "first_entry_not_started",
      },
      {
        polling_station_id: 2,
        status: "first_entry_not_started",
      },
      {
        polling_station_id: 3,
        status: "first_entry_in_progress",
      },
      {
        polling_station_id: 4,
        status: "first_entry_in_progress",
      },
    ]}
    election={mockElection}
    pollingStations={mockPollingStations}
    navigate={navigate}
  />
);

export default {
  title: "App / ElectionStatus",
  argTypes: {
    background: {
      control: { type: "background" },
      options: ["#f9fafb", "white"],
      defaultValue: "#f9fafb",
    },
  },
};
