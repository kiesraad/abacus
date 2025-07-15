import type { Meta, StoryObj } from "@storybook/react-vite";

import { getCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { CommitteeSessionStatus } from "@/types/generated/openapi";

import { CommitteeSessionCard } from "./CommitteeSessionCard";

type Props = {
  number: number;
  status: CommitteeSessionStatus;
  startDate: string;
  startTime: string;
  currentSession: boolean;
};

export const DefaultCommitteeSessionCard: StoryObj<Props> = {
  render: ({ number, status, startDate, startTime, currentSession }) => {
    const committeeSession = getCommitteeSessionMockData({
      number: number,
      status: status,
      start_date: startDate,
      start_time: startTime,
      location: "Juinen",
    });
    return <CommitteeSessionCard committeeSession={committeeSession} currentSession={currentSession} />;
  },
};

export default {
  args: {
    number: 1,
    status: "data_entry_in_progress",
    startDate: "2025-11-08",
    startTime: "09:15",
    currentSession: true,
  },
  argTypes: {
    number: {
      options: [1, 2, 3],
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
    startDate: {
      control: { type: "text" },
    },
    startTime: {
      control: { type: "text" },
    },
    currentSession: {
      options: [true, false],
      control: { type: "radio" },
    },
  },
  parameters: {
    backgrounds: {
      light: { name: "light", value: "#f9fafb" },
    },
  },
  globals: {
    backgrounds: { value: "light" },
  },
} satisfies Meta;
