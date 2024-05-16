import type { Story } from "@ladle/react";

import { InputField } from "./InputField";

export const DefaultSmallWideInputField: Story = () => {
  return (
    <InputField
      name="default-small-wide"
      label="Default Small Wide"
      hint="Default Small Wide hint"
      size="small"
    />
  );
};

export const DefaultMediumWideInputField: Story = () => {
  return (
    <InputField
      name="default-medium-wide"
      label="Default Medium Wide"
      hint="Default Medium Wide hint"
      size="medium"
    />
  );
};

export const DefaultLargeWideInputField: Story = () => {
  return (
    <InputField
      name="default-large-wide"
      label="Default Large Wide"
      hint="Default Large Wide hint"
    />
  );
};

export const ErrorLargeWideInputField: Story = () => {
  return (
    <InputField
      name="error-large-wide"
      label="Error Large Wide"
      hint="Default Large Wide hint"
      error="There is an error"
    />
  );
};

export const DefaultSmallNarrowInputField: Story = () => {
  return (
    <InputField
      name="default-small-narrow"
      label="Default Small Narrow"
      hint="Default Small Narrow hint"
      size="small"
      width="narrow"
    />
  );
};

export const DefaultMediumNarrowInputField: Story = () => {
  return (
    <InputField
      name="default-medium-narrow"
      label="Default Medium Narrow"
      hint="Default Medium Narrow hint"
      size="medium"
      width="narrow"
    />
  );
};

export const DefaultLargeNarrowInputField: Story = () => {
  return (
    <InputField
      name="default-large-narrow"
      label="Default Large Narrow"
      hint="Default Large Narrow hint"
      width="narrow"
    />
  );
};

export const ErrorLargeNarrowInputField: Story = () => {
  return (
    <InputField
      name="error-large-narrow"
      label="Error Large Narrow"
      hint="Default Large Narrow hint"
      width="narrow"
      error="There is an error"
    />
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

export const ErrorTextAreaInputField: Story = () => {
  return (
    <InputField
      name="error-text-area"
      label="Error Text Area"
      hint="Default Text Area hint"
      size="text-area"
      error="There is an error"
    />
  );
};
