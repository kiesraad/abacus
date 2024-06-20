import type { Story } from "@ladle/react";

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
};

export const WideInputField: Story = () => {
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
      <InputField
        name="default-large-wide"
        label="Default Large Wide"
        hint="Default Large Wide hint"
      />
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
};

export const NarrowInputField: Story = () => {
  return (
    <>
      <InputField
        name="default-small-narrow"
        label="Default Small Narrow"
        hint="Default Small Narrow hint"
        fieldSize="small"
        fieldWidth="narrow"
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
};

export const TextAreaInputField: Story = () => {
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
};

export const CustomizableInputField: Story<Props> = ({
  label,
  subtext,
  hint,
  value,
  type,
  fieldSize,
  fieldWidth,
  error,
  disabled,
  maxLength,
}) => {
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
    />
  );
};

CustomizableInputField.args = {
  label: "Input Field Label",
  subtext: "with subtext",
  hint: "Input Field hint",
  error: "",
  maxLength: undefined,
};
CustomizableInputField.argTypes = {
  type: {
    options: ["text", "password"],
    control: { type: "radio" },
    defaultValue: "text",
  },
  fieldSize: {
    options: ["small", "medium", "large", "text-area"],
    control: { type: "radio" },
    defaultValue: "large",
  },
  fieldWidth: {
    options: ["narrow", "wide"],
    control: { type: "radio" },
    defaultValue: "wide",
  },
  disabled: {
    options: [true, false],
    control: { type: "radio" },
    defaultValue: false,
  },
};
