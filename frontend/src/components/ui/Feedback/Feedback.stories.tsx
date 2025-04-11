import type { Story } from "@ladle/react";

import { AlertType, FeedbackId } from "@/types/ui";

import { ClientValidationResultCode } from "@kiesraad/ui";

import { Feedback } from "./Feedback";

type Props = {
  id: FeedbackId;
  type: AlertType;
  data: ClientValidationResultCode[];
};

export const SingleError: Story = () => {
  return <Feedback id="feedback-error" type="error" data={["F202"]} />;
};

export const SingleErrorCustomAction: Story = () => {
  return <Feedback id="feedback-error" type="error" data={["F101"]} />;
};

export const MultipleErrors: Story = () => {
  return <Feedback id="feedback-error" type="error" data={["F201", "F202"]} />;
};

export const SingleWarning: Story = () => {
  return <Feedback id="feedback-warning" type="warning" data={["W203"]} />;
};

export const MultipleWarnings: Story = () => {
  return <Feedback id="feedback-warning" type="warning" data={["W201", "W202"]} />;
};

export const CustomizableErrors: Story<Props> = ({ id = "feedback-error", type = "error", data }) => (
  <Feedback id={id} type={type} data={data} />
);

CustomizableErrors.argTypes = {
  data: {
    options: ["F101", "F201", "F202", "F203", "F204", "F301", "F302", "F303", "F304", "F305", "F401"],
    control: { type: "multi-select" },
    defaultValue: ["F101", "F201", "F202", "F203", "F204", "F301", "F302", "F303", "F304", "F305", "F401"],
  },
};

export const CustomizableWarnings: Story<Props> = ({ id = "feedback-warning", type = "warning", data }) => (
  <Feedback id={id} type={type} data={data} />
);

CustomizableWarnings.argTypes = {
  data: {
    options: ["W201", "W202", "W203", "W204", "W205", "W206", "W207", "W208", "W209", "W301", "W302"],
    control: { type: "multi-select" },
    defaultValue: ["W201", "W202", "W203", "W204", "W205", "W206", "W207", "W208", "W209", "W301", "W302"],
  },
};
