import { Story } from "@ladle/react";

import { getCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { CommitteeSessionStatus } from "@/types/generated/openapi";

import { CommitteeSessionCard } from "./CommitteeSessionCard";

type Props = {
  status: CommitteeSessionStatus;
  startDate: string;
  startTime: string;
  currentSession: boolean;
};

export const DefaultCommitteeSessionCard: Story<Props> = ({ status, startDate, startTime, currentSession }) => {
  const committeeSession = getCommitteeSessionMockData({
    status: status,
    start_date: startDate,
    start_time: startTime,
    location: "Juinen",
  });
  return <CommitteeSessionCard committeeSession={committeeSession} currentSession={currentSession} />;
};

export default {
  argTypes: {
    status: {
      options: [
        "created",
        "data_entry_not_started",
        "data_entry_in_progress",
        "data_entry_paused",
        "data_entry_finished",
      ],
      control: { type: "radio" },
      defaultValue: "data_entry_in_progress",
    },
    startDate: {
      control: { type: "text" },
      defaultValue: "2025-11-08",
    },
    startTime: {
      control: { type: "text" },
      defaultValue: "09:15",
    },
    currentSession: {
      options: [true, false],
      defaultValue: true,
      control: { type: "radio" },
    },
    background: {
      control: { type: "background" },
      options: ["#f9fafb"],
      defaultValue: "#f9fafb",
    },
  },
};
