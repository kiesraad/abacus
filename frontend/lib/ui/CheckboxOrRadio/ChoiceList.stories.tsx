import type { Story } from "@ladle/react";

import { ChoiceListNew } from "@kiesraad/ui";

type Props = {
  label: string;
};

export const DefaultChoiceListNewCheckboxNew: Story<Props> = ({ label }) => (
  <ChoiceListNew>
    <ChoiceListNew.Title>ChoiceListNew Checkbox Title</ChoiceListNew.Title>
    <ChoiceListNew.Checkbox id="default-checkbox" defaultChecked={false} label={label} />
    <ChoiceListNew.Checkbox id="default-checkbox-with-description" defaultChecked={false} label={label}>
      This is a description
    </ChoiceListNew.Checkbox>
    <ChoiceListNew.Checkbox id="default-checkbox-error" defaultChecked={false} label={label} hasError />
    <ChoiceListNew.Checkbox id="default-checkbox-disabled" defaultChecked={false} label={label} disabled />
    <ChoiceListNew.Checkbox id="default-checkbox-disabled-checked" defaultChecked={true} label={label} disabled />
    <div style={{ width: 200 }}>
      <ChoiceListNew.Checkbox id="default-checkbox-cramped" defaultChecked={false} label={label} />
    </div>
  </ChoiceListNew>
);

DefaultChoiceListNewCheckboxNew.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};

export const DefaultChoiceListNewRadioNew: Story<Props> = ({ label }) => (
  <ChoiceListNew>
    <ChoiceListNew.Title>ChoiceListNew Radio Title</ChoiceListNew.Title>
    <ChoiceListNew.Radio id="default-radio" defaultChecked={false} label={label} />
    <ChoiceListNew.Radio id="default-radio-with-description" defaultChecked={false} label={label}>
      This is a description
    </ChoiceListNew.Radio>
    <ChoiceListNew.Radio id="default-radio-error" defaultChecked={false} label={label} hasError />
    <ChoiceListNew.Radio id="default-radio-disabled" defaultChecked={false} label={label} disabled />
    <ChoiceListNew.Radio id="default-radio-disabled-checked" defaultChecked={true} label={label} disabled />
    <div style={{ width: 200 }}>
      <ChoiceListNew.Radio id="default-radio-cramped" defaultChecked={false} label={label} />
    </div>
  </ChoiceListNew>
);

DefaultChoiceListNewRadioNew.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};
