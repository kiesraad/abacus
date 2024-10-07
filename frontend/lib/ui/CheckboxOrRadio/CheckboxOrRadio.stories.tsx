import type { Story } from "@ladle/react";

import { CheckboxOrRadio } from "@kiesraad/ui";

type Props = {
  label: string;
};

export const DefaultCheckboxNew: Story<Props> = ({ label }) => (
  <div>
    <CheckboxOrRadio id="default-checkbox" type="checkbox" defaultChecked={false} label={label} />
    <br />
    <br />
    <CheckboxOrRadio id="default-checkbox-with-description" type="checkbox" defaultChecked={false} label={label}>
      This is a description
    </CheckboxOrRadio>
    <br />
    <br />
    <CheckboxOrRadio id="default-checkbox-error" type="checkbox" defaultChecked={false} label={label} hasError />
    <br />
    <br />
    <CheckboxOrRadio id="default-checkbox-disabled" type="checkbox" defaultChecked={false} label={label} disabled />
    <br />
    <br />
    <CheckboxOrRadio
      id="default-checkbox-disabled-checked"
      type="checkbox"
      defaultChecked={true}
      label={label}
      disabled
    />
    <br />
    <br />
    <div style={{ width: 200 }}>
      <CheckboxOrRadio id="default-checkbox-cramped" type="checkbox" defaultChecked={false} label={label} />
    </div>
  </div>
);

DefaultCheckboxNew.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};

export const DefaultCheckboxIndeterminateNew: Story<Props> = ({ label }) => (
  <div>
    <CheckboxOrRadio
      id="default-checkbox-indeterminate"
      type="checkbox"
      defaultChecked={false}
      label={label}
      indeterminate
    />
    <br />
    <br />
    <CheckboxOrRadio
      id="default-checkbox-indeterminate-with-description"
      type="checkbox"
      defaultChecked={false}
      label={label}
      indeterminate
    >
      This is a description
    </CheckboxOrRadio>
    <br />
    <br />
    <CheckboxOrRadio
      id="default-checkbox-indeterminate-error"
      type="checkbox"
      defaultChecked={false}
      label={label}
      indeterminate
      hasError
    />
    <br />
    <br />
    <CheckboxOrRadio
      id="default-checkbox-indeterminate-disabled"
      type="checkbox"
      defaultChecked={false}
      label={label}
      indeterminate
      disabled
    />
    <br />
    <br />
    <CheckboxOrRadio
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
      <CheckboxOrRadio
        id="default-checkbox-indeterminate-cramped"
        type="checkbox"
        defaultChecked={false}
        label={label}
        indeterminate
      />
    </div>
  </div>
);

DefaultCheckboxIndeterminateNew.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};

export const DefaultRadioNew: Story<Props> = ({ label }) => (
  <div>
    <CheckboxOrRadio id="default-radio" type="radio" defaultChecked={false} label={label} />
    <br />
    <br />
    <CheckboxOrRadio id="default-radio-with-description" type="radio" defaultChecked={false} label={label}>
      This is a description
    </CheckboxOrRadio>
    <br />
    <br />
    <CheckboxOrRadio id="default-radio-error" type="radio" defaultChecked={false} label={label} hasError />
    <br />
    <br />
    <CheckboxOrRadio id="default-radio-disabled" type="radio" defaultChecked={false} label={label} disabled />
    <br />
    <br />
    <CheckboxOrRadio id="default-radio-disabled-checked" type="radio" defaultChecked={true} label={label} disabled />
    <br />
    <br />
    <div style={{ width: 200 }}>
      <CheckboxOrRadio id="default-radio-cramped" type="radio" defaultChecked={false} label={label} />
    </div>
  </div>
);

DefaultRadioNew.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};
