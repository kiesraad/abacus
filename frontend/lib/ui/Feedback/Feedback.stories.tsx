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
  return <Feedback id="feedback-warning" type="warning" data={["W203"]} />;
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

export const CustomizableErrors: Story<Props> = ({
  id = "feedback-error",
  type = "error",
  data,
}) => <Feedback id={id} type={type} data={data} />;

CustomizableErrors.argTypes = {
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
    ],
    control: { type: "multi-select" },
    defaultValue: ["F101"],
  },
};

export const CustomizableWarnings: Story<Props> = ({
  id = "feedback-warning",
  type = "warning",
  data,
}) => <Feedback id={id} type={type} data={data} />;

CustomizableWarnings.argTypes = {
  data: {
    options: [
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
    defaultValue: ["W201"],
  },
};
