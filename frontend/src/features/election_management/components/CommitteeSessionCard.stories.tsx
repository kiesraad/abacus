import type { Meta, StoryObj } from "@storybook/react-vite";

import { getCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { CommitteeSessionStatus } from "@/types/generated/openapi";

import { CommitteeSessionCard } from "./CommitteeSessionCard";

type Props = {
  number: number;
  status: CommitteeSessionStatus;
  startDateTime: string;
  currentSession: boolean;
};

export const DefaultCommitteeSessionCard: StoryObj<Props> = {
  render: ({ number, status, startDateTime, currentSession }) => {
    const committeeSession = getCommitteeSessionMockData({
      number: number,
      status: status,
      start_date_time: startDateTime,
      location: "Juinen",
    });
    return <CommitteeSessionCard committeeSession={committeeSession} currentSession={currentSession} />;
  },
};

export default {
  args: {
    number: 1,
    status: "data_entry_in_progress",
    startDateTime: "2025-11-08T09:15:00",
    currentSession: true,
  },
  argTypes: {
    number: {
      options: [1, 2, 3, 4, 5, 6],
      control: { type: "radio" },
    },
    status: {
      options: [
        "created",
        "data_entry_not_started",
        "data_entry_in_progress",
        "data_entry_paused",
        "data_entry_finished",
      ],
      control: { type: "radio" },
    },
    startDateTime: {
      control: { type: "text" },
    },
    currentSession: {
      options: [true, false],
      control: { type: "radio" },
    },
  },
} satisfies Meta;
