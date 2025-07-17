import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";

import { Role, ValidationResultCode } from "@/types/generated/openapi";
import { AlertType, FeedbackId } from "@/types/ui";

import { Feedback } from "./Feedback";

type Props = {
  id: FeedbackId;
  type: AlertType;
  data: ValidationResultCode[];
  userRole: Role;
};

export const SingleError: StoryFn = () => {
  return <Feedback id="feedback-error" type="error" data={["F202"]} userRole="typist" />;
};

export const SingleErrorCustomAction: StoryFn = () => {
  return <Feedback id="feedback-error" type="error" data={["F201"]} userRole="typist" />;
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
    data: ["F201", "F202", "F204", "F301", "F302", "F303", "F304", "F305", "F401"],
    userRole: "typist",
  },
  argTypes: {
    data: {
      options: [
        "F201",
        "F202",
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
        "W205",
        "W206",
        "W208",
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
