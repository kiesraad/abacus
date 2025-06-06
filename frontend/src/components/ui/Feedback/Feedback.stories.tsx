import { Story } from "@ladle/react";

import { AlertType, FeedbackId } from "@/types/ui";

import { Feedback } from "./Feedback";
import { ClientValidationResultCode } from "./Feedback.types";

type Props = {
  id: FeedbackId;
  type: AlertType;
  data: ClientValidationResultCode[];
  isTypist: boolean;
};

export const SingleError: Story = () => {
  return <Feedback id="feedback-error" type="error" data={["F202"]} isTypist={true} />;
};

export const SingleErrorCustomAction: Story = () => {
  return <Feedback id="feedback-error" type="error" data={["F101"]} isTypist={true} />;
};

export const MultipleErrors: Story = () => {
  return <Feedback id="feedback-error" type="error" data={["F201", "F202"]} isTypist={true} />;
};

export const SingleWarning: Story = () => {
  return <Feedback id="feedback-warning" type="warning" data={["W203"]} isTypist={true} />;
};

export const MultipleWarnings: Story = () => {
  return <Feedback id="feedback-warning" type="warning" data={["W201", "W202"]} isTypist={true} />;
};

export const CustomizableErrors: Story<Props> = ({ id = "feedback-error", type = "error", data, isTypist }) => (
  <Feedback id={id} type={type} data={data} isTypist={isTypist} />
);

CustomizableErrors.argTypes = {
  data: {
    options: ["F101", "F201", "F202", "F203", "F204", "F301", "F302", "F303", "F304", "F305", "F401"],
    control: { type: "multi-select" },
    defaultValue: ["F101", "F201", "F202", "F203", "F204", "F301", "F302", "F303", "F304", "F305", "F401"],
  },
  isTypist: {
    options: [true, false],
    control: { type: "radio" },
    defaultValue: false,
  },
};

export const CustomizableWarnings: Story<Props> = ({ id = "feedback-warning", type = "warning", data, isTypist }) => (
  <Feedback id={id} type={type} data={data} isTypist={isTypist} />
);

CustomizableWarnings.argTypes = {
  data: {
    options: ["W001", "W201", "W202", "W203", "W204", "W205", "W206", "W207", "W208", "W209", "W301", "W302"],
    control: { type: "multi-select" },
    defaultValue: ["W001", "W201", "W202", "W203", "W204", "W205", "W206", "W207", "W208", "W209", "W301", "W302"],
  },
  isTypist: {
    options: [true, false],
    control: { type: "radio" },
    defaultValue: false,
  },
};
