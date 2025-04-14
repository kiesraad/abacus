import type { Story } from "@ladle/react";

import { Checkbox, Radio } from "./CheckboxAndRadio";

type Props = {
  label: string;
};

export const DefaultCheckbox: Story<Props> = ({ label }) => (
  <div>
    <Checkbox id="default-checkbox" defaultChecked={false} label={label} />
    <br />
    <br />
    <Checkbox id="default-checkbox-with-description" defaultChecked={false} label={label}>
      This is a description
    </Checkbox>
    <br />
    <br />
    <Checkbox id="default-checkbox-error" defaultChecked={false} label={label} hasError />
    <br />
    <br />
    <Checkbox id="default-checkbox-disabled" defaultChecked={false} label={label} disabled />
    <br />
    <br />
    <Checkbox id="default-checkbox-disabled-checked" defaultChecked={true} label={label} disabled />
    <br />
    <br />
    <div style={{ width: 200 }}>
      <Checkbox id="default-checkbox-cramped" defaultChecked={false} label={label} />
    </div>
  </div>
);

DefaultCheckbox.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};

export const DefaultCheckboxIndeterminate: Story<Props> = ({ label }) => (
  <div>
    <Checkbox id="default-checkbox-indeterminate" defaultChecked={false} label={label} indeterminate />
    <br />
    <br />
    <Checkbox id="default-checkbox-indeterminate-with-description" defaultChecked={false} label={label} indeterminate>
      This is a description
    </Checkbox>
    <br />
    <br />
    <Checkbox id="default-checkbox-indeterminate-error" defaultChecked={false} label={label} indeterminate hasError />
    <br />
    <br />
    <Checkbox
      id="default-checkbox-indeterminate-disabled"
      defaultChecked={false}
      label={label}
      indeterminate
      disabled
    />
    <br />
    <br />
    <Checkbox
      id="default-checkbox-indeterminate-disabled-checked"
      defaultChecked={true}
      label={label}
      indeterminate
      disabled
    />
    <br />
    <br />
    <div style={{ width: 200 }}>
      <Checkbox id="default-checkbox-indeterminate-cramped" defaultChecked={false} label={label} indeterminate />
    </div>
  </div>
);

DefaultCheckboxIndeterminate.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};

export const DefaultRadio: Story<Props> = ({ label }) => (
  <div>
    <Radio id="default-radio" defaultChecked={false} label={label} />
    <br />
    <br />
    <Radio id="default-radio-with-description" defaultChecked={false} label={label}>
      This is a description
    </Radio>
    <br />
    <br />
    <Radio id="default-radio-error" defaultChecked={false} label={label} hasError />
    <br />
    <br />
    <Radio id="default-radio-disabled" defaultChecked={false} label={label} disabled />
    <br />
    <br />
    <Radio id="default-radio-disabled-checked" defaultChecked={true} label={label} disabled />
    <br />
    <br />
    <div style={{ width: 200 }}>
      <Radio id="default-radio-cramped" defaultChecked={false} label={label} />
    </div>
  </div>
);

DefaultRadio.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};
