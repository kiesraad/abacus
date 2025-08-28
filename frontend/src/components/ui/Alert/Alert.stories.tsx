import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { expect, fn, userEvent, within } from "storybook/test";

import { Alert } from "./Alert";

const meta = {
  component: Alert,
  args: {
    type: "notify",
    children: (
      <>
        <h2>Nog niet ingesteld</h2>
        <p>
          Deze computer is nog niet ingesteld voor gebruik. Log in als beheerder of verkiezingsleider en stel in hoe
          deze computer gebruikt gaat worden.
        </p>
      </>
    ),
    // @ts-expect-error: onClose is mapped using argTypes, which is not understood by TypeScript
    onClose: false,
  },
  argTypes: {
    children: { control: false },
    type: {
      options: ["error", "warning", "notify", "success"],
      control: { type: "radio" },
    },
    onClose: {
      control: { type: "boolean" },
      mapping: {
        true: action("on-close"),
        false: undefined,
      },
    },
  },
} satisfies Meta<typeof Alert>;
export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultAlert: Story = {
  args: {},

  play: async ({ canvas }) => {
    const alert = canvas.getByRole("alert");
    await expect(within(alert).getByRole("img")).toBeVisible();
    await expect(within(alert).getByRole("heading", { level: 2, name: "Nog niet ingesteld" })).toBeVisible();
    await expect(within(alert).getByRole("paragraph")).toHaveTextContent(
      "Deze computer is nog niet ingesteld voor gebruik. Log in als beheerder of verkiezingsleider en stel in hoe deze computer gebruikt gaat worden.",
    );
  },
};

export const ClosableAlert: Story = {
  args: {
    type: "error",
    children: (
      <>
        <h2>Error Title</h2>
        <p>This is an error message with a close button.</p>
      </>
    ),
    onClose: fn(),
  },

  play: async ({ args, canvas }) => {
    const alert = canvas.getByRole("alert");
    await expect(within(alert).getByRole("heading", { level: 2, name: "Error Title" })).toBeVisible();
    await expect(within(alert).getByRole("paragraph")).toHaveTextContent(
      "This is an error message with a close button.",
    );

    const closeButton = within(alert).getByTitle("Melding sluiten");
    await expect(closeButton).toBeVisible();
    await userEvent.click(closeButton);
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const SmallAlert = {
  args: {
    type: "warning",
    small: true,
    children: <p>This is a small warning alert.</p>,
  },
} satisfies Story;

export const NoIconAlert: Story = {
  args: {
    type: "success",
    variant: "no-icon",
    children: <p>This is a success alert without an icon.</p>,
  },

  play: async ({ canvas }) => {
    const alert = canvas.getByRole("alert");
    await expect(within(alert).queryByRole("img")).not.toBeInTheDocument();
    await expect(within(alert).getByRole("paragraph")).toHaveTextContent("This is a success alert without an icon.");
  },
};

export const InlineAlert = {
  args: {
    type: "notify",
    inline: true,
    title: "Inline Alert Title",
    children: <p>This is an inline alert with a title.</p>,
  },
} satisfies Story;

export const InlineSmall = {
  args: {
    type: "warning",
    inline: true,
    small: true,
    title: "Small Inline Alert",
    children: <p>This is a small inline alert.</p>,
  },
} satisfies Story;

export const InlineClosableAlert = {
  args: {
    type: "error",
    inline: true,
    title: "Inline Closable Alert",
    children: <p>This is an inline alert that can be closed.</p>,
    onClose: action("on-close"),
  },
} satisfies Story;

export const InlineNoIconAlert = {
  args: {
    type: "success",
    inline: true,
    variant: "no-icon",
    title: "Inline No Icon Alert",
    children: <p>This is an inline alert without an icon.</p>,
  },
} satisfies Story;
