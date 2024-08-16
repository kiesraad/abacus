import type { Story } from "@ladle/react";

import { ClientValidationResultCode } from "@kiesraad/ui";

import { AlertType, FeedbackId } from "../ui.types";
import { Feedback } from "./Feedback";

type Props = {
  id: FeedbackId;
  type: AlertType;
  data: ClientValidationResultCode[];
};

export const SingleError: Story = () => {
  return <Feedback id="feedback-error" type="error" data={["F202"]} />;
};

export const SingleErrorWithCustomAction: Story = () => {
  return (
    <Feedback id="feedback-error" type="error" data={["F101"]}>
      <ul>
        <li>Controleer of rubriek 3 is ingevuld. Is dat zo? Kies hieronder 'ja'</li>
        <li>Wel een vinkje, maar rubriek 3 niet ingevuld? Overleg met de coördinator</li>
        <li>Geen vinkje? Kies dan 'nee'.</li>
      </ul>
    </Feedback>
  );
};

export const MultipleErrors: Story = () => {
  return <Feedback id="feedback-error" type="error" data={["F201", "F202"]} />;
};

export const SingleWarning: Story = () => {
  return <Feedback id="feedback-warning" type="warning" data={["W202"]} />;
};

export const MultipleWarnings: Story = () => {
  return <Feedback id="feedback-warning" type="warning" data={["W201", "W202"]} />;
};

export const SingleServerError: Story = () => {
  return (
    <Feedback
      id="feedback-server-error"
      type="error"
      data={{ errorCode: 500, message: "Internal Server Error" }}
    />
  );
};

export const CustomizableFeedback: Story<Props> = ({ id, type, data }) => (
  <Feedback id={id} type={type} data={data} />
);

CustomizableFeedback.args = {
  data: ["F101", "F201", "F202"],
};
CustomizableFeedback.argTypes = {
  id: {
    options: ["feedback-error", "feedback-warning", "feedback-server-error"],
    control: { type: "radio" },
    defaultValue: "feedback-error",
  },
  type: {
    options: ["error", "warning"],
    control: { type: "inline-radio" },
    defaultValue: "error",
  },
};
