import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { extendedPollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";

import { ElectionStatus } from "./ElectionStatus";

interface StoryProps {
  navigate: (path: string) => void;
}

export const DefaultElectionStatus: StoryObj<StoryProps> = {
  render: ({ navigate }) => {
    const today = new Date();
    today.setHours(10, 20);

    return (
      <ElectionStatus
        statuses={[
          {
            polling_station_id: 1,
            status: "first_entry_not_started",
          },
          {
            polling_station_id: 2,
            status: "second_entry_not_started",
            first_entry_user_id: 1,
            finished_at: today.toISOString(),
          },
          {
            polling_station_id: 3,
            status: "first_entry_in_progress",
            first_entry_user_id: 1,
            first_entry_progress: 60,
          },
          {
            polling_station_id: 4,
            status: "second_entry_in_progress",
            first_entry_user_id: 1,
            second_entry_user_id: 2,
            first_entry_progress: 100,
            second_entry_progress: 20,
          },
          {
            polling_station_id: 5,
            status: "definitive",
            first_entry_user_id: 1,
            second_entry_user_id: 2,
            first_entry_progress: 100,
            second_entry_progress: 100,
            finished_at: today.toISOString(),
          },
          {
            polling_station_id: 6,
            status: "first_entry_in_progress",
            first_entry_user_id: 1,
            first_entry_progress: 25,
          },
          {
            polling_station_id: 7,
            status: "entries_different",
            first_entry_user_id: 1,
            second_entry_user_id: 2,
            first_entry_progress: 100,
            second_entry_progress: 100,
          },
          {
            polling_station_id: 8,
            status: "first_entry_has_errors",
            first_entry_user_id: 1,
            first_entry_progress: 100,
          },
        ]}
        election={electionMockData}
        pollingStations={extendedPollingStationMockData}
        navigate={navigate}
      />
    );
  },
};

export const Empty: StoryObj<StoryProps> = {
  render: ({ navigate }) => (
    <ElectionStatus statuses={[]} election={electionMockData} pollingStations={[]} navigate={navigate} />
  ),
};

export default {
  args: {
    navigate: fn(),
  },
  argTypes: {
    navigate: { action: "navigate" },
  },
  parameters: {
    needsUsers: true,
  },
} satisfies Meta<StoryProps>;
