import type { Meta, StoryObj } from "@storybook/react-vite";

import { getCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import type { CommitteeSessionStatus } from "@/types/generated/openapi";

import { CommitteeSessionCard } from "./CommitteeSessionCard";

type Props = {
  number: number;
  status: CommitteeSessionStatus;
  startDateTime: string;
  isCurrentSession: boolean;
};

export const DefaultCommitteeSessionCard: StoryObj<Props> = {
  render: ({ number, status, startDateTime, isCurrentSession }) => {
    const committeeSession = getCommitteeSessionMockData({
      number: number,
      status: status,
      start_date_time: startDateTime,
      location: "Juinen",
    });
    return <CommitteeSessionCard committeeSession={committeeSession} isCurrentSession={isCurrentSession} />;
  },
};

export default {
  args: {
    number: 1,
    status: "data_entry_in_progress",
    startDateTime: "2025-11-08T09:15:00",
    isCurrentSession: true,
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
    isCurrentSession: {
      options: [true, false],
      control: { type: "radio" },
    },
  },
  parameters: {
    userRole: "coordinator",
  },
} satisfies Meta;
