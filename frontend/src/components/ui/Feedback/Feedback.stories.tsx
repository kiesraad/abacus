import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import { csbElectionMockData, electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { roleValues, type ValidationResultCode } from "@/types/generated/openapi";
import { Feedback } from "./Feedback";

const validationResultCodes = Object.keys(validationResultMockData) as ValidationResultCode[];

const meta = {
  component: Feedback,
  argTypes: {
    validationResults: {
      options: validationResultCodes,
      control: { type: "multi-select" },
    },
    election: {
      options: ["GSB", "CSB"],
      mapping: {
        GSB: electionMockData,
        CSB: csbElectionMockData,
      },
    },
    type: {
      options: ["error", "warning"],
    },
    userRole: {
      options: roleValues,
    },
  },
} satisfies Meta<typeof Feedback>;

export default meta;

type StoryArgs = Omit<ComponentProps<typeof Feedback>, "validationResults"> & {
  validationResults: ValidationResultCode[];
};
type Story = StoryObj<StoryArgs>;

export const GSBCoordinator: Story = {
  render: (args) => (
    <Feedback {...args} validationResults={args.validationResults.map((code) => validationResultMockData[code])} />
  ),
  args: {
    id: "feedback-error",
    type: "error",
    election: electionMockData,
    validationResults: ["F201", "F202"],
    userRole: "coordinator_gsb",
  },
  play: async ({ canvas }) => {
    const titles = await canvas.findAllByRole("heading");
    await expect(titles).toHaveLength(2);

    await expect(titles[0]).toHaveTextContent("A en B tellen niet op tot D");
    await expect(titles[0]!.nextSibling).toHaveTextContent("F.201");

    await expect(titles[1]).toHaveTextContent("De stemmen op lijsten tellen niet op tot E");
    await expect(titles[1]!.nextSibling).toHaveTextContent("F.202");

    const actionLists = await canvas.findAllByRole("list");
    await expect(actionLists).toHaveLength(2);
  },
};

export const CSBTypist: Story = {
  render: (args) => (
    <Feedback {...args} validationResults={args.validationResults.map((c) => validationResultMockData[c])} />
  ),
  args: {
    id: "feedback-error",
    type: "error",
    election: csbElectionMockData,
    validationResults: ["F201", "F202"],
    userRole: "typist_csb",
  },
  play: async ({ canvas }) => {
    const titles = await canvas.findAllByRole("heading");
    await expect(titles).toHaveLength(1);
    await expect(titles[0]).toHaveTextContent("Controleer je antwoorden");

    const codes = titles[0]!.nextSibling;
    await expect(codes).toHaveTextContent("F.201, F.202");

    const actionLists = await canvas.findAllByRole("list");
    await expect(actionLists).toHaveLength(1);
  },
};
