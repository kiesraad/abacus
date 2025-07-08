import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { NumberInput } from "./NumberInput";

export const DefaultNumberInput: StoryObj = {
  render: () => {
    return <NumberInput id="test" data-testid="test" defaultValue={12300} />;
  },
  play: async ({ canvas, userEvent, step }) => {
    const input = canvas.getByRole("textbox");

    await step("Test number formatting", async () => {
      // Test number formatting
      await expect(input).toBeVisible();
      await expect(input).toHaveValue("12.300");
    });

    await step("Test focus removes formatting", async () => {
      // Test focus removes formatting
      await userEvent.click(input);
      await expect(input).toHaveValue("12300");
    });

    await step("Test blur restores formatting", async () => {
      // Test blur restores formatting
      await userEvent.tab();
      await expect(input).toHaveValue("12.300");
    });

    await step("Test changing the value", async () => {
      // Test changing the value
      await userEvent.clear(input);
      await userEvent.type(input, "9999");
      await expect(input).toHaveValue("9999");
    });

    await step("Test blur formats the new value", async () => {
      // Test blur formats the new value
      await userEvent.tab();
      await expect(input).toHaveValue("9.999");
    });

    await step("Test paste", async () => {
      // Test paste
      await userEvent.dblClick(input);
      await userEvent.paste("12345");
      await userEvent.tab();
      await expect(input).toHaveValue("12.345");
    });

    await step("Test paste tooltip", async () => {
      // Test paste tooltip
      await userEvent.click(input);
      await userEvent.paste("asdf");
      await expect(canvas.getByRole("dialog")).toHaveTextContent(
        "Je probeert asdf te plakken. Je kunt hier alleen cijfers invullen.",
      );
    });
  },
};

export default {} satisfies Meta;
