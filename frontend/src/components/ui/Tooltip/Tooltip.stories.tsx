import type { Story } from "@ladle/react";

import { IconWarningSquare } from "@/components/generated/icons";
import { tx } from "@/i18n/translate";

import { Icon } from "../Icon/Icon";
import { Tooltip } from "./Tooltip";

export const PermanentTooltip: Story = () => {
  return (
    <Tooltip
      content={
        <div className="tooltip-content">
          <Icon color="warning" icon={<IconWarningSquare />} />
          <span>{tx("invalid_paste_content", undefined, { value: "abc123" })}</span>
        </div>
      }
      onClose={() => {}}
    >
      <input id="demo-input" type="text" placeholder="" />
    </Tooltip>
  );
};
