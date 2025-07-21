import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { IconWarningSquare } from "@/components/generated/icons";
import { tx } from "@/i18n/translate";

import { Icon } from "../Icon/Icon";
import { Tooltip, TooltipProps } from "./Tooltip";

export const PermanentTooltip: StoryObj = {
  render: () => {
    return (
      <div style={{ padding: "2rem" }}>
        <Tooltip
          content={
            <div className="tooltip-content">
              <Icon color="warning" icon={<IconWarningSquare />} />
              <span>{tx("invalid_paste_content", undefined, { value: "abc123" })}</span>
            </div>
          }
          onClose={() => {
            // Permanent tooltip - do nothing on close attempts
          }}
        >
          <input id="demo-input" type="text" placeholder="This tooltip cannot be closed" />
        </Tooltip>
      </div>
    );
  },

  play: async ({ canvas, userEvent }) => {
    // Test tooltip is initially visible
    const tooltip = canvas.getByRole("dialog");
    await expect(tooltip).toBeVisible();

    // Test tooltip content
    const warningIcon = within(tooltip).getByRole("img");
    await expect(warningIcon).toHaveAttribute("data-icon", "IconWarningSquare");

    // Test tooltip text content
    const tooltipText = within(tooltip).getByText(/abc123/);
    await expect(tooltipText).toBeVisible();

    // Test that tooltip remains visible after clicking outside
    await userEvent.click(document.body);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(tooltip).toBeVisible();

    // Test that tooltip remains visible after pressing a key
    await userEvent.keyboard("{Escape}");
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(tooltip).toBeVisible();
  },
};

export const InteractiveTooltip: StoryObj<TooltipProps> = {
  render: () => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
      <div style={{ padding: "2rem" }}>
        <p>Click the button to show tooltip, click anywhere or press any key to hide it.</p>
        <Tooltip
          content={
            showTooltip ? (
              <div className="tooltip-content">
                <Icon color="warning" icon={<IconWarningSquare />} />
                <span>This is a warning tooltip</span>
              </div>
            ) : undefined
          }
          onClose={() => {
            setShowTooltip(false);
          }}
        >
          <button
            onClick={() => {
              setShowTooltip(true);
            }}
          >
            Show Tooltip
          </button>
        </Tooltip>
      </div>
    );
  },

  play: async ({ canvas, userEvent }) => {
    // Initially no tooltip should be visible
    let tooltip = canvas.queryByRole("dialog");
    await expect(tooltip).toBeNull();

    // Click button to show tooltip
    const button = canvas.getByRole("button", { name: "Show Tooltip" });
    await userEvent.click(button);

    // Tooltip should now be visible
    tooltip = canvas.getByRole("dialog");
    await expect(tooltip).toBeVisible();

    // Click outside to close
    await userEvent.click(document.body);

    // Wait a bit for the event to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Tooltip should be hidden
    tooltip = canvas.queryByRole("dialog");
    await expect(tooltip).toBeNull();
  },
};

export default {
  title: "Components/UI/Tooltip",
  component: Tooltip,
} satisfies Meta<TooltipProps>;
