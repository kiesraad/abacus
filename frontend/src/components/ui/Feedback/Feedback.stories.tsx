import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";

import { Role } from "@/types/generated/openapi";
import { AlertType, FeedbackId } from "@/types/ui";

import { Feedback } from "./Feedback";
import { ClientValidationResultCode } from "./Feedback.types";

type Props = {
  id: FeedbackId;
  type: AlertType;
  data: ClientValidationResultCode[];
  userRole: Role;
};

export const SingleError: StoryFn = () => {
  return <Feedback id="feedback-error" type="error" data={["F202"]} userRole="typist" />;
};

export const SingleErrorCustomAction: StoryFn = () => {
  return <Feedback id="feedback-error" type="error" data={["F101"]} userRole="typist" />;
};

export const MultipleErrors: StoryFn = () => {
  return <Feedback id="feedback-error" type="error" data={["F201", "F202"]} userRole="typist" />;
};

export const SingleWarning: StoryFn = () => {
  return <Feedback id="feedback-warning" type="warning" data={["W203"]} userRole="typist" />;
};

export const MultipleWarnings: StoryFn = () => {
  return <Feedback id="feedback-warning" type="warning" data={["W201", "W202"]} userRole="typist" />;
};

export const CustomizableErrors: StoryObj<Props> = {
  render: ({ id = "feedback-error", type = "error", data, userRole }) => (
    <Feedback id={id} type={type} data={data} userRole={userRole} />
  ),
};

export const CustomizableWarnings: StoryObj<Props> = {
  render: ({ id = "feedback-warning", type = "warning", data, userRole }) => (
    <Feedback id={id} type={type} data={data} userRole={userRole} />
  ),
};

export default {
  args: {
    data: ["F101", "F201", "F202", "F203", "F204", "F301", "F302", "F303", "F304", "F305", "F401"],
    userRole: "typist",
  },
  argTypes: {
    data: {
      options: [
        "F101",
        "F201",
        "F202",
        "F203",
        "F204",
        "F301",
        "F302",
        "F303",
        "F304",
        "F305",
        "F401",
        "W001",
        "W201",
        "W202",
        "W203",
        "W204",
        "W205",
        "W206",
        "W207",
        "W208",
        "W209",
        "W301",
        "W302",
      ],
      control: { type: "multi-select" },
    },
    userRole: {
      options: ["administrator", "coordinator", "typist"],
      control: { type: "select" },
    },
  },
} satisfies Meta<Props>;
