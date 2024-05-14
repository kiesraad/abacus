import type { Story } from "@ladle/react";

import { InputField } from "./InputField";

export const DefaultLargeInputField: Story = () => {
  return <InputField name="default-large" label="Default Large" hint="Default Large hint" />;
};

export const DefaultSmallInputField: Story = () => {
  return (
    <InputField name="default-small" label="Default Small" hint="Default Small hint" size="small" />
  );
};

export const DefaultTextAreaInputField: Story = () => {
  return (
    <InputField
      name="default-text-area"
      label="Default Text Area"
      hint="Default Text Area hint"
      size="text-area"
    />
  );
};
