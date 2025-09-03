import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { ValidationResultCode } from "@/types/generated/openapi";

import { Feedback } from "./Feedback";

const validationresultCodes = Object.keys(validationResultMockData) as ValidationResultCode[];

const meta = {
  component: Feedback,
  argTypes: {
    data: {
      options: validationresultCodes,
      control: { type: "multi-select" },
    },
    type: {
      options: ["error", "warning"],
    },
  },
} satisfies Meta<typeof Feedback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Coordinator: Story = {
  args: {
    id: "feedback-error",
    type: "error",
    data: ["F201", "F202"],
    userRole: "coordinator",
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

export const Typist: Story = {
  args: {
    id: "feedback-error",
    type: "error",
    data: ["F201", "F202"],
    userRole: "typist",
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
