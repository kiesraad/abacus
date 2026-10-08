import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { getCSBCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { csbElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { DataEntryImportButton } from "./DataEntryImportButton";

interface StoryProps {
  navigate: (path: string) => void;
}

export const VisibleForCoordinatorCSB: StoryObj<StoryProps> = {
  render: (args) => (
    <TestUserProvider userRole={"coordinator_csb"}>
      <DataEntryImportButton
        election={csbElectionMockData}
        committeeSession={getCSBCommitteeSessionMockData()}
        navigate={args.navigate}
      />
    </TestUserProvider>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Tellingbestand GSB importeren" })).toBeVisible();
  },
};

export default {
  args: {
    navigate: fn(),
  },
} satisfies Meta<StoryProps>;
