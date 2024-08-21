import type { Story } from "@ladle/react";

import { Checkbox } from "./Checkbox";

type Props = {
  label: string;
};

export const DefaultCheckbox: Story<Props> = ({ label }) => (
  <Checkbox id="default-checkbox" defaultChecked={false}>
    {label}
  </Checkbox>
);

export default {
  args: {
    label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
  },
};
