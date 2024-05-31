import type { Story } from "@ladle/react";
import { Alert } from "./Alert";

import { AlertType } from "../ui.types";

type Props = {
  type: AlertType;
  title: string;
  text: string;
  onClose?: () => void;
};

export const DefaultAlert: Story<Props> = ({ type, title, text }) => (
  <Alert type={type}>
    <h2>{title}</h2>
    <p>{text}</p>
  </Alert>
);

export const ClosableAlert: Story<Props> = ({ type, title, text, onClose }) => (
  <Alert type={type} onClose={onClose}>
    <h2>{title}</h2>
    <p>{text}</p>
  </Alert>
);

export default {
  args: {
    title: "Nog niet ingesteld",
    text: "Deze computer is nog niet ingesteld voor gebruik. Log in als beheerder of verkiezingsleider en stel in hoe deze computer gebruikt gaat worden.",
  },
  argTypes: {
    type: {
      options: ["error", "warning", "notify", "success"],
      control: { type: "radio" },
      defaultValue: "error",
    },
    onClose: {
      action: "Close action",
    },
  },
};
