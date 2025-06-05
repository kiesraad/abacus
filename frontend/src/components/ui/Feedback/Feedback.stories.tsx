import { Story } from "@ladle/react";

import { AlertType, FeedbackId } from "@/types/ui";

import { Feedback } from "./Feedback";
import { ClientValidationResultCode } from "./Feedback.types";

type Props = {
  id: FeedbackId;
  type: AlertType;
  data: ClientValidationResultCode[];
  userRole: "typist" | "coordinator";
};

export const SingleError: Story = () => {
  return <Feedback id="feedback-error" type="error" data={["F202"]} userRole="typist" />;
};

export const SingleErrorCustomAction: Story = () => {
  return <Feedback id="feedback-error" type="error" data={["F101"]} userRole="typist" />;
};

export const MultipleErrors: Story = () => {
  return <Feedback id="feedback-error" type="error" data={["F201", "F202"]} userRole="typist" />;
};

export const SingleWarning: Story = () => {
  return <Feedback id="feedback-warning" type="warning" data={["W203"]} userRole="typist" />;
};

export const MultipleWarnings: Story = () => {
  return <Feedback id="feedback-warning" type="warning" data={["W201", "W202"]} userRole="typist" />;
};

export const CustomizableErrors: Story<Props> = ({ id = "feedback-error", type = "error", data, userRole }) => (
  <Feedback id={id} type={type} data={data} userRole={userRole} />
);

CustomizableErrors.argTypes = {
  data: {
    options: ["F101", "F201", "F202", "F203", "F204", "F301", "F302", "F303", "F304", "F305", "F401"],
    control: { type: "multi-select" },
    defaultValue: ["F101", "F201", "F202", "F203", "F204", "F301", "F302", "F303", "F304", "F305", "F401"],
  },
  userRole: {
    options: ["typist", "coordinator"],
    control: { type: "select" },
    defaultValue: "typist",
  },
};

export const CustomizableWarnings: Story<Props> = ({ id = "feedback-warning", type = "warning", data, userRole }) => (
  <Feedback id={id} type={type} data={data} userRole={userRole} />
);

CustomizableWarnings.argTypes = {
  data: {
    options: ["W001", "W201", "W202", "W203", "W204", "W205", "W206", "W207", "W208", "W209", "W301", "W302"],
    control: { type: "multi-select" },
    defaultValue: ["W001", "W201", "W202", "W203", "W204", "W205", "W206", "W207", "W208", "W209", "W301", "W302"],
  },
  userRole: {
    options: ["typist", "coordinator"],
    control: { type: "select" },
    defaultValue: "typist",
  },
};
