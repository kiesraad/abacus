import type { Story } from "@ladle/react";
import { Tooltip } from "./Tooltip";
import { Icon } from "../Icon/Icon";
import { IconWarningSquare } from "@kiesraad/icon";

type Props = {
  text: string;
};

export const DefaultTooltip: Story<Props> = ({ text }) => {
  return (
    <div>
      <Tooltip
        content={
          text || (
            <>
              <Icon icon={<IconWarningSquare />} color="warning" />
              Je probeert <strong>24,29</strong> te plakken. Je kunt hier alleen cijfers invullen.
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
