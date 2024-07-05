import type { Story } from "@ladle/react";
import { Tooltip } from "./Tooltip";
import { Icon } from "../Icon/Icon";
import { IconWarningSquare } from "@kiesraad/icon";

type Props = {
  text: string;
};

//TODO: tooltip renders correct in application but not in storybook

export const DefaultTooltip: Story<Props> = ({ text }) => {
  return (
    <div>
      <Tooltip
        content={
          text || (
            <>
              <Icon icon={<IconWarningSquare />} color="warning" />
              hier alleen <strong>cijfers</strong> invullen.
            </>
          )
        }
      >
        <input defaultValue="Hello" />
      </Tooltip>
    </div>
  );
};

export default {
  args: {
    text: ``,
  },
};
