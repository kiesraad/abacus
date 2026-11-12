import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { t } from "@/i18n/translate";
import { NumberOfVotersForm } from "./NumberOfVotersForm";

const meta = {
  component: NumberOfVotersForm,
} satisfies Meta<typeof NumberOfVotersForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Form: Story = {
  args: {
    defaultValue: 0,
    instructions: t("election_management.enter_number_of_voters"),
    hint: t("election_management.enter_a_number"),
    button: t("save"),
    onSubmit: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Hoeveel kiesgerechtigden telt het GSB?" }),
    ).toBeVisible();
    await expect(canvas.getByText(args.instructions)).toBeInTheDocument();
    await expect(canvas.getByText(args.hint!)).toBeInTheDocument();

    const inputField = canvas.getByRole("textbox", { name: "Aantal kiesgerechtigden" });
    await expect(inputField).toHaveValue("");

    const button = canvas.getByRole("button");
    await expect(button).toHaveAccessibleName("Opslaan");

    await userEvent.click(button);
    await expect(args.onSubmit).toHaveBeenCalledWith(0);

    await userEvent.type(inputField, "2000");
    await userEvent.click(button);
    await expect(args.onSubmit).toHaveBeenCalledWith(2000);
  },
};
