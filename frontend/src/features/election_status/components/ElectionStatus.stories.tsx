import type { Story } from "@ladle/react";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { extendedPollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { userMockData } from "@/testing/api-mocks/UserMockData";

import { ElectionStatus } from "./ElectionStatus";

interface StoryProps {
  navigate: (path: string) => void;
}

export const DefaultElectionStatus: Story<StoryProps> = ({ navigate }) => {
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
      users={userMockData}
      navigate={navigate}
    />
  );
};

export const Empty: Story<StoryProps> = ({ navigate }) => (
  <ElectionStatus
    statuses={[]}
    election={electionMockData}
    pollingStations={[]}
    users={userMockData}
    navigate={navigate}
  />
);

export default {
  title: "Features / Election status",
  argTypes: {
    background: {
      control: { type: "background" },
      options: ["#f9fafb", "white"],
      defaultValue: "#f9fafb",
    },
  },
};
