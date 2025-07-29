import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { InputField } from "./InputField";

type Props = {
  label: string;
  subtext: string;
  hint: string;
  value: string;
  type: string;
  fieldSize: "small" | "medium" | "large" | "text-area";
  fieldWidth: "narrow" | "wide";
  error: string;
  disabled: boolean;
  maxLength: number;
  numberInput: boolean;
};

export const WideInputField: StoryObj = {
  render: () => {
    return (
      <>
        <InputField
          name="default-small-wide"
          label="Default Small Wide"
          subtext="with subtext"
          hint="Default Small Wide hint"
          fieldSize="small"
        />
        <InputField
          name="default-medium-wide"
          label="Default Medium Wide"
          hint="Default Medium Wide hint"
          fieldSize="medium"
        />
        <InputField name="default-large-wide" label="Default Large Wide" hint="Default Large Wide hint" />
        <InputField
          name="disabled-large-wide"
          label="Disabled Large Wide"
          hint="Disabled Large Wide hint"
          value="Input Field value"
          disabled
        />
        <InputField
          name="error-large-wide"
          label="Error Large Wide"
          hint="Error Large Wide hint"
          error="There is an error"
        />
      </>
    );
  },
  play: async ({ canvas }) => {
    // Test default small wide input field
    const defaultSmallWideInput = canvas.getByRole("textbox", { name: "Default Small Wide with subtext" });
    await expect(canvas.getByText("Default Small Wide")).toBeVisible();
    await expect(canvas.getByText("with subtext")).toBeVisible();
    await expect(defaultSmallWideInput).toBeVisible();
    await expect(canvas.getByText("Default Small Wide hint", { exact: true })).toBeVisible();

    // Test error large wide input field
    const errorLargeWideInput = canvas.getByRole("textbox", { name: "Error Large Wide" });
    await expect(canvas.getByText("Error Large Wide", { exact: true })).toBeVisible();
    await expect(errorLargeWideInput).toBeVisible();

    // Hint should be hidden when there's an error
    const errorHint = canvas.queryByText("Error Large Wide hint", { exact: true });
    if (errorHint) {
      await expect(errorHint).not.toBeVisible();
    }
    await expect(canvas.getByText("There is an error", { exact: true })).toBeVisible();
  },
};

export const NarrowInputField: StoryObj = {
  render: () => {
    return (
      <>
        <InputField
          name="default-small-narrow"
          label="Default Small Narrow"
          hint="Default Small Narrow hint"
          fieldSize="small"
          fieldWidth="narrow"
          maxLength={9}
        />
        <InputField
          name="default-medium-narrow"
          label="Default Medium Narrow"
          subtext="with subtext"
          hint="Default Medium Narrow hint"
          fieldSize="medium"
          fieldWidth="narrow"
        />
        <InputField
          name="default-large-narrow"
          label="Default Large Narrow"
          hint="Default Large Narrow hint"
          fieldWidth="narrow"
        />
        <InputField
          name="disabled-large-narrow"
          label="Disabled Large Narrow"
          hint="Disabled Large Narrow hint"
          value="Input Field value"
          fieldWidth="narrow"
          disabled
        />
        <InputField
          name="error-large-narrow"
          label="Error Large Narrow"
          hint="Error Large Narrow hint"
          fieldWidth="narrow"
          error="There is an error"
        />
      </>
    );
  },
  play: async ({ canvas }) => {
    // Test default medium narrow input field
    const defaultMediumNarrowInput = canvas.getByRole("textbox", { name: "Default Medium Narrow with subtext" });
    await expect(canvas.getByText("Default Medium Narrow")).toBeVisible();
    await expect(canvas.getByText("with subtext")).toBeVisible();
    await expect(defaultMediumNarrowInput).toBeVisible();
    await expect(canvas.getByText("Default Medium Narrow hint", { exact: true })).toBeVisible();

    // Test error large narrow input field
    const errorLargeNarrowInput = canvas.getByRole("textbox", { name: "Error Large Narrow" });
    await expect(canvas.getByText("Error Large Narrow", { exact: true })).toBeVisible();
    await expect(errorLargeNarrowInput).toBeVisible();

    // Hint should be hidden when there's an error
    const errorHint = canvas.queryByText("Error Large Narrow hint", { exact: true });
    if (errorHint) {
      await expect(errorHint).not.toBeVisible();
    }
    await expect(canvas.getByText("There is an error", { exact: true })).toBeVisible();
  },
};

export const TextAreaInputField: StoryObj = {
  render: () => {
    return (
      <>
        <InputField
          name="default-text-area"
          label="Default Text Area"
          subtext="with subtext"
          hint="Default Text Area hint"
          fieldSize="text-area"
        />
        <InputField
          name="disabled-text-area"
          label="Disabled Text Area"
          hint="Disabled Text Area hint"
          value="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. In nibh mauris cursus mattis molestie. Sollicitudin ac orci phasellus egestas tellus rutrum tellus. Aenean vel elit scelerisque mauris pellentesque pulvinar. Amet nisl purus in mollis nunc. Molestie ac feugiat sed lectus. Viverra orci sagittis eu volutpat odio facilisis. Elementum facilisis leo vel fringilla est ullamcorper. Faucibus scelerisque eleifend donec pretium vulputate sapien nec sagittis. Quisque egestas diam in arcu cursus euismod."
          fieldSize="text-area"
          disabled
        />
        <InputField
          name="error-text-area"
          label="Error Text Area"
          hint="Error Text Area hint"
          fieldSize="text-area"
          error="There is an error"
        />
      </>
    );
  },
  play: async ({ canvas }) => {
    // Test default text area input field
    const defaultTextAreaInput = canvas.getByRole("textbox", { name: "Default Text Area with subtext" });
    await expect(canvas.getByText("Default Text Area")).toBeVisible();
    await expect(canvas.getByText("with subtext")).toBeVisible();
    await expect(defaultTextAreaInput).toBeVisible();
    await expect(canvas.getByText("Default Text Area hint", { exact: true })).toBeVisible();

    // Test error text area input field
    const errorTextAreaInput = canvas.getByRole("textbox", { name: "Error Text Area" });
    await expect(canvas.getByText("Error Text Area", { exact: true })).toBeVisible();
    await expect(errorTextAreaInput).toBeVisible();

    // Hint should be hidden when there's an error
    const errorHint = canvas.queryByText("Error Text Area hint", { exact: true });
    if (errorHint) {
      await expect(errorHint).not.toBeVisible();
    }
    await expect(canvas.getByText("There is an error", { exact: true })).toBeVisible();
  },
};

export const CustomizableInputField: StoryObj<Props> = {
  render: ({ label, subtext, hint, value, type, fieldSize, fieldWidth, error, disabled, maxLength, numberInput }) => {
    return (
      <InputField
        name="input-field"
        label={label}
        subtext={subtext}
        hint={hint}
        value={value}
        type={type}
        fieldSize={fieldSize}
        fieldWidth={fieldWidth}
        error={error}
        disabled={disabled}
        maxLength={maxLength}
        numberInput={numberInput}
      />
    );
  },
};

export default {
  args: {
    label: "Input Field Label",
    subtext: "with subtext",
    hint: "Input Field hint",
    error: "",
    maxLength: undefined,
    type: "text",
    fieldSize: "large",
    fieldWidth: "wide",
    disabled: false,
    numberInput: false,
  },
  argTypes: {
    type: {
      options: ["text", "password"],
      control: { type: "radio" },
    },
    fieldSize: {
      options: ["small", "medium", "large", "text-area"],
      control: { type: "radio" },
    },
    fieldWidth: {
      options: ["narrow", "wide"],
      control: { type: "radio" },
    },
    disabled: {
      options: [true, false],
      control: { type: "radio" },
    },
    maxLength: {
      type: "number",
    },
    numberInput: {
      options: [true, false],
      control: { type: "radio" },
    },
  },
} satisfies Meta<Props>;
