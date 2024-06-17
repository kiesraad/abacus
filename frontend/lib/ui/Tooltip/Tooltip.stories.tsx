import * as React from "react";
import type { Story } from "@ladle/react";
import { Tooltip } from "./Tooltip";

type Props = {
  text: string;
};

export const DefaultTooltip: Story<Props> = ({ text }) => {
  const ref = React.useRef<HTMLInputElement>(null);

  return (
    <div>
      <input defaultValue="Hello" ref={ref} />
      <Tooltip anchor={ref} closeOnClickOrKeyboardEvent={false}>
        <p>
          {text || (
            <>
              Je probeert <strong>24,29</strong> te plakken. Je kunt hier alleen cijfers invullen.
            </>
          )}
        </p>
      </Tooltip>
    </div>
  );
};

export default {
  args: {
    text: ``,
  },
};
