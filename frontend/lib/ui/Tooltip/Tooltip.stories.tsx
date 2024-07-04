import type { Story } from "@ladle/react";
import { Tooltip } from "./Tooltip";

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
            <div>
              Je probeert <strong>24,29</strong> te plakken. Je kunt hier alleen cijfers invullen.
            </div>
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
