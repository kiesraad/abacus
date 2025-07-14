import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox, Radio } from "./CheckboxAndRadio";

type Props = {
  label: string;
};

export const DefaultCheckbox: StoryObj<Props> = {
  render: ({ label }) => (
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
  ),
};

export const DefaultCheckboxIndeterminate: StoryObj<Props> = {
  render: ({ label }) => (
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
  ),
};

export const DefaultRadio: StoryObj<Props> = {
  render: ({ label }) => (
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
  ),
};

export default {
  args: {
    label: "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen.",
  },
} satisfies Meta<Props>;
