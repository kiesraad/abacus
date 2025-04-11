import type { Story } from "@ladle/react";

import { AlertType } from "@/types/ui";

import { Alert } from "./Alert";

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

export const SmallAlert: Story<Props> = ({ type, text }) => (
  <Alert type={type} variant="small">
    <p>{text}</p>
  </Alert>
);

export const NoIconAlert: Story<Props> = ({ type, text }) => (
  <Alert type={type} variant="no-icon">
    <p>{text}</p>
  </Alert>
);

export const InlineAlert: Story<Props> = ({ type, title, text }) => (
  <Alert type={type} inline title={title}>
    <p>{text}</p>
  </Alert>
);

export const InlineSmall: Story<Props> = ({ type, title, text }) => (
  <Alert type={type} inline variant="small" title={title}>
    <p>{text}</p>
  </Alert>
);

export const InlineClosableAlert: Story<Props> = ({ type, title, text, onClose }) => (
  <Alert type={type} inline title={title} onClose={onClose}>
    <p>{text}</p>
  </Alert>
);

export const InlineNoIconAlert: Story<Props> = ({ type, title, text }) => (
  <Alert type={type} inline variant="no-icon" title={title}>
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
