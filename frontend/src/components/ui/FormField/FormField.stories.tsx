import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { FormField } from "./FormField";

const testInput = <input id="test-input" type="text" placeholder="Enter text here" />;

const meta = {
  component: FormField,
  args: {
    children: testInput,
    hasError: false,
    hasWarning: false,
  },
  argTypes: {
    children: {
      control: false,
    },
    hasError: {
      control: { type: "boolean" },
    },
    hasWarning: {
      control: { type: "boolean" },
    },
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultFormField: Story = {
  play: async ({ canvas, step }) => {
    await step("no error or warning icons are present", async () => {
      const errorIcon = canvas.queryByRole("img", { name: "bevat een fout" });
      const warningIcon = canvas.queryByRole("img", { name: "bevat een waarschuwing" });
      await expect(errorIcon).not.toBeInTheDocument();
      await expect(warningIcon).not.toBeInTheDocument();
    });

    await step("input works", async () => {
      const input = canvas.getByRole("textbox");
      await userEvent.type(input, "Input test");
      await expect(input).toHaveValue("Input test");
    });
  },
};

export const FormFieldWithError: Story = {
  args: {
    hasError: true,
    hasWarning: false,
  },
  play: async ({ canvas, step }) => {
    await step("only error icon is present", async () => {
      const errorIcon = canvas.getByRole("img", { name: "bevat een fout" });
      await expect(errorIcon).toBeInTheDocument();

      const warningIcon = canvas.queryByRole("img", { name: "bevat een waarschuwing" });
      await expect(warningIcon).not.toBeInTheDocument();
    });

    await step("input works", async () => {
      const input = canvas.getByRole("textbox");
      await userEvent.type(input, "Input test");
      await expect(input).toHaveValue("Input test");
    });
  },
};

export const FormFieldWithWarning: Story = {
  args: {
    hasError: false,
    hasWarning: true,
  },
  play: async ({ canvas, step }) => {
    await step("only warning icon is present", async () => {
      const errorIcon = canvas.queryByRole("img", { name: "bevat een fout" });
      await expect(errorIcon).not.toBeInTheDocument();

      const warningIcon = canvas.getByRole("img", { name: "bevat een waarschuwing" });
      await expect(warningIcon).toBeInTheDocument();
    });

    await step("input works", async () => {
      const input = canvas.getByRole("textbox");
      await userEvent.type(input, "Input test");
      await expect(input).toHaveValue("Input test");
    });
  },
};

export const FormFieldWithErrorAndWarning: Story = {
  args: {
    hasError: true,
    hasWarning: true,
  },
  play: async ({ canvas, step }) => {
    await step("only error icon is present (error takes precedence over warning)", async () => {
      const errorIcon = canvas.getByRole("img", { name: "bevat een fout" });
      await expect(errorIcon).toBeInTheDocument();

      const warningIcon = canvas.queryByRole("img", { name: "bevat een waarschuwing" });
      await expect(warningIcon).not.toBeInTheDocument();
    });

    await step("input works", async () => {
      const input = canvas.getByRole("textbox");
      await userEvent.type(input, "Input test");
      await expect(input).toHaveValue("Input test");
    });
  },
};
