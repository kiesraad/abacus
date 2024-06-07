import * as React from "react";
import type { Story } from "@ladle/react";
import { useTooltip } from "./useTooltip";

type Props = {
  html: string;
};

export const DefaultTooltip: Story<Props> = ({ html }) => {
  const { show, hide } = useTooltip();

  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      show({ anchor: ref.current, position: "top", html });
    }
  }, [show, html, ref]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    show({ anchor: e.currentTarget, position: "top", html });
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
    html: "Je probeert <strong>24,29</strong> te plakken. Je kunt hier alleen cijfers invullen.",
  },
};
