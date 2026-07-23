import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { t } from "@/i18n/translate";
import type { ResolveDifferencesAction } from "@/types/generated/openapi";

import cls from "./ResolveDifferences.module.css";
import { ResolveDifferencesForm } from "./ResolveDifferencesForm";

const meta = {
  component: ResolveDifferencesForm,
  args: {
    firstEntryName: "Gebruiker01",
    secondEntryName: "Gebruiker02",
    action: undefined,
    setAction: fn(),
    validationError: undefined,
    onSubmit: fn(),
  },
  argTypes: {
    action: { control: false },
    validationError: { control: "text" },
  },
} satisfies Meta<typeof ResolveDifferencesForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Render(args) {
    const [action, setAction] = useState<ResolveDifferencesAction | undefined>(args.action);

    return (
      <main className={cls.resolveDifferences}>
        <article>
          <ResolveDifferencesForm
            {...args}
            action={action}
            setAction={(next) => {
              args.setAction(next);
              setAction(next);
            }}
          />
        </article>
      </main>
    );
  },
};

export const FirstEntrySelected: Story = {
  ...Default,
  args: {
    action: "keep_first_entry",
  },
};

export const WithValidationError: Story = {
  ...Default,
  args: {
    validationError: t("resolve_differences.required_error"),
  },
};
