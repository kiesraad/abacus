import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { politicalGroupMockData } from "@/testing/api-mocks/ElectionMockData";
import { CandidateList } from "./CandidateList";

const meta = {
  component: CandidateList,
} satisfies Meta<typeof CandidateList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CandidateListWithLinks: Story = {
  args: {
    politicalGroup: politicalGroupMockData,
    deceasedCandidates: [
      { candidate_number: politicalGroupMockData.candidates[0]!.number, pg_number: politicalGroupMockData.number },
    ],
    onClick: fn(),
  },
};

export const CandidateListWithoutLinks: Story = {
  args: {
    politicalGroup: politicalGroupMockData,
    deceasedCandidates: [
      { candidate_number: politicalGroupMockData.candidates[0]!.number, pg_number: politicalGroupMockData.number },
    ],
    onClick: undefined,
  },
};
