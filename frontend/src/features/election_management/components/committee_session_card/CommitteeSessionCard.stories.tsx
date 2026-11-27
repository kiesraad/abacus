import type { Meta, StoryObj } from "@storybook/react-vite";

import { getCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { TestUserProvider } from "@/testing/TestUserProvider";
import type { CommitteeSessionStatus, Role } from "@/types/generated/openapi";
import { CommitteeSessionCard } from "./CommitteeSessionCard";

type Props = {
  number: number;
  userRole: Role;
  status: CommitteeSessionStatus;
  startDateTime: string;
  isCurrentSession: boolean;
};

export const GSBCommitteeSessionCard: StoryObj<Props> = {
  argTypes: {
    number: {
      options: [1, 2, 3, 4, 5, 6],
      control: { type: "radio" },
    },
    userRole: {
      options: ["administrator", "coordinator_gsb"],
      control: { type: "radio" },
    },
    isCurrentSession: {
      options: [true, false],
      control: { type: "radio" },
    },
  },
  args: {
    userRole: "coordinator_gsb",
  },
  render: ({ number, userRole, status, startDateTime, isCurrentSession }) => {
    const committeeSession = getCommitteeSessionMockData({
      number: number,
      status: status,
      start_date_time: startDateTime,
      location: "Juinen",
    });
    return (
      <TestUserProvider userRole={userRole}>
        <CommitteeSessionCard
          committeeSession={committeeSession}
          committeeCategory="GSB"
          isCurrentSession={isCurrentSession}
        />
      </TestUserProvider>
    );
  },
};

export const HSBCommitteeSessionCard: StoryObj<Props> = {
  argTypes: {
    number: {
      options: [1],
      control: false,
    },
    userRole: {
      options: ["administrator", "coordinator_hsb"],
      control: { type: "radio" },
    },
    isCurrentSession: {
      options: [true],
      control: { type: "radio" },
    },
  },
  args: {
    userRole: "coordinator_hsb",
  },
  render: ({ number, userRole, status, startDateTime, isCurrentSession }) => {
    const committeeSession = getCommitteeSessionMockData({
      number: number,
      status: status,
      start_date_time: startDateTime,
      location: "Juinen",
    });
    return (
      <TestUserProvider userRole={userRole}>
        <CommitteeSessionCard
          committeeSession={committeeSession}
          committeeCategory="HSB"
          isCurrentSession={isCurrentSession}
        />
      </TestUserProvider>
    );
  },
};

type CSBProps = Props & {
  apportionmentFinalised: boolean;
};

export const CSBCommitteeSessionCard: StoryObj<CSBProps> = {
  argTypes: {
    number: {
      options: [1],
      control: false,
    },
    userRole: {
      options: ["administrator", "coordinator_csb"],
      control: { type: "radio" },
    },
    isCurrentSession: {
      options: [true],
      control: { type: "radio" },
    },
    apportionmentFinalised: {
      options: [true, false],
      control: { type: "radio" },
    },
  },
  args: {
    userRole: "coordinator_csb",
  },
  render: ({ number, userRole, status, startDateTime, isCurrentSession, apportionmentFinalised }) => {
    const committeeSession = getCommitteeSessionMockData({
      number: number,
      status: status,
      start_date_time: startDateTime,
      location: "Juinen",
    });
    if (apportionmentFinalised) {
      // overrideOnce("get", "/api/elections/2/apportionment/state", 200, {
      //   type: "Finalised",
      //   deceased_candidates: [],
      //   lists_drawn: [],
      //   candidates_drawn: [],
      // } satisfies ApportionmentState);
    } else {
      // overrideOnce("get", "/api/elections/2/apportionment/state", 200, {
      //   type: "Uninitialised",
      // } satisfies ApportionmentState);
    }
    return (
      <TestUserProvider userRole={userRole}>
        <CommitteeSessionCard
          committeeSession={committeeSession}
          committeeCategory="CSB"
          isCurrentSession={isCurrentSession}
        />
      </TestUserProvider>
    );
  },
};

export default {
  args: {
    number: 1,
    status: "data_entry",
    startDateTime: "2025-11-08T09:15:00",
    isCurrentSession: true,
  },
  argTypes: {
    status: {
      options: ["created", "in_preparation", "data_entry", "paused", "completed"],
      control: { type: "radio" },
    },
    startDateTime: {
      control: { type: "text" },
    },
  },
  parameters: {
    needsUsers: true,
  },
} satisfies Meta;
