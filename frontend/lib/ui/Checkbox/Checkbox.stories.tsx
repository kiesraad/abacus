import type { Story } from "@ladle/react";

import { Checkbox } from "./Checkbox";

type Props = {
  label: string;
};

export const DefaultCheckbox: Story<Props> = ({ label }) => (
  <div>
    <Checkbox id="default-checkbox" defaultChecked={false}>
      {label}
    </Checkbox>
    <br />
    <br />
    <Checkbox id="default-checkbox-error" defaultChecked={false} hasError>
      {label}
    </Checkbox>
    <br />
    <br />
    <div style={{ width: 200 }}>
      <Checkbox id="default-checkbox-cramped" defaultChecked={false}>
        {label}
      </Checkbox>
    </div>
  </div>
);

export default {
  args: {
    label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
  },
};
