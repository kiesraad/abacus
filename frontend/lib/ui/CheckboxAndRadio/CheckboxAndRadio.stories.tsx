import type { Story } from "@ladle/react";

import { CheckboxAndRadio } from "@kiesraad/ui";

type Props = {
  label: string;
};

export const DefaultCheckbox: Story<Props> = ({ label }) => (
  <div>
    <CheckboxAndRadio id="default-checkbox" type="checkbox" defaultChecked={false} label={label} />
    <br />
    <br />
    <CheckboxAndRadio id="default-checkbox-with-description" type="checkbox" defaultChecked={false} label={label}>
      This is a description
    </CheckboxAndRadio>
    <br />
    <br />
    <CheckboxAndRadio id="default-checkbox-error" type="checkbox" defaultChecked={false} label={label} hasError />
    <br />
    <br />
    <CheckboxAndRadio id="default-checkbox-disabled" type="checkbox" defaultChecked={false} label={label} disabled />
    <br />
    <br />
    <CheckboxAndRadio
      id="default-checkbox-disabled-checked"
      type="checkbox"
      defaultChecked={true}
      label={label}
      disabled
    />
    <br />
    <br />
    <div style={{ width: 200 }}>
      <CheckboxAndRadio id="default-checkbox-cramped" type="checkbox" defaultChecked={false} label={label} />
    </div>
  </div>
);

DefaultCheckbox.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};

export const DefaultCheckboxIndeterminate: Story<Props> = ({ label }) => (
  <div>
    <CheckboxAndRadio
      id="default-checkbox-indeterminate"
      type="checkbox"
      defaultChecked={false}
      label={label}
      indeterminate
    />
    <br />
    <br />
    <CheckboxAndRadio
      id="default-checkbox-indeterminate-with-description"
      type="checkbox"
      defaultChecked={false}
      label={label}
      indeterminate
    >
      This is a description
    </CheckboxAndRadio>
    <br />
    <br />
    <CheckboxAndRadio
      id="default-checkbox-indeterminate-error"
      type="checkbox"
      defaultChecked={false}
      label={label}
      indeterminate
      hasError
    />
    <br />
    <br />
    <CheckboxAndRadio
      id="default-checkbox-indeterminate-disabled"
      type="checkbox"
      defaultChecked={false}
      label={label}
      indeterminate
      disabled
    />
    <br />
    <br />
    <CheckboxAndRadio
      id="default-checkbox-indeterminate-disabled-checked"
      type="checkbox"
      defaultChecked={true}
      label={label}
      indeterminate
      disabled
    />
    <br />
    <br />
    <div style={{ width: 200 }}>
      <CheckboxAndRadio
        id="default-checkbox-indeterminate-cramped"
        type="checkbox"
        defaultChecked={false}
        label={label}
        indeterminate
      />
    </div>
  </div>
);

DefaultCheckboxIndeterminate.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};

export const DefaultRadio: Story<Props> = ({ label }) => (
  <div>
    <CheckboxAndRadio id="default-radio" type="radio" defaultChecked={false} label={label} />
    <br />
    <br />
    <CheckboxAndRadio id="default-radio-with-description" type="radio" defaultChecked={false} label={label}>
      This is a description
    </CheckboxAndRadio>
    <br />
    <br />
    <CheckboxAndRadio id="default-radio-error" type="radio" defaultChecked={false} label={label} hasError />
    <br />
    <br />
    <CheckboxAndRadio id="default-radio-disabled" type="radio" defaultChecked={false} label={label} disabled />
    <br />
    <br />
    <CheckboxAndRadio id="default-radio-disabled-checked" type="radio" defaultChecked={true} label={label} disabled />
    <br />
    <br />
    <div style={{ width: 200 }}>
      <CheckboxAndRadio id="default-radio-cramped" type="radio" defaultChecked={false} label={label} />
    </div>
  </div>
);

DefaultRadio.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};
