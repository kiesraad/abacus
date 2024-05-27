import type { Story } from "@ladle/react";

import { InputField } from "./InputField";

export const WideInputField: Story = () => {
  return (
    <>
      <InputField
        name="default-small-wide"
        label="Default Small Wide"
        subtext="with subtext"
        hint="Default Small Wide hint"
        size="small"
      />
      <InputField
        name="default-medium-wide"
        label="Default Medium Wide"
        hint="Default Medium Wide hint"
        size="medium"
      />
      <InputField
        name="default-large-wide"
        label="Default Large Wide"
        hint="Default Large Wide hint"
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
        size="small"
        width="narrow"
      />
      <InputField
        name="default-medium-narrow"
        label="Default Medium Narrow"
        subtext="with subtext"
        hint="Default Medium Narrow hint"
        size="medium"
        width="narrow"
      />
      <InputField
        name="default-large-narrow"
        label="Default Large Narrow"
        hint="Default Large Narrow hint"
        width="narrow"
      />
      <InputField
        name="error-large-narrow"
        label="Error Large Narrow"
        hint="Error Large Narrow hint"
        width="narrow"
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
        size="text-area"
      />
      <InputField
        name="error-text-area"
        label="Error Text Area"
        hint="Error Text Area hint"
        size="text-area"
        error="There is an error"
      />
    </>
  );
};
