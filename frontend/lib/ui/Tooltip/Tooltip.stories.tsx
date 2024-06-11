import * as React from "react";
import type { Story } from "@ladle/react";
import { useTooltip } from "./useTooltip";

type Props = {
  text: string;
};

export const DefaultTooltip: Story<Props> = ({ text }) => {
  const { show, hide } = useTooltip();

  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      show({ anchor: ref.current, position: "top", text });
    }
  }, [show, text, ref]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    show({ anchor: e.currentTarget, position: "top", text });
  };

  const handleBlur = () => {
    hide();
  };

  return (
    <div>
      <input defaultValue="Hello" ref={ref} onFocus={handleFocus} onBlur={handleBlur} />
    </div>
  );
};

export default {
  args: {
    text: `Je probeert "24,29" te plakken. Je kunt hier alleen cijfers invullen.`,
  },
};
