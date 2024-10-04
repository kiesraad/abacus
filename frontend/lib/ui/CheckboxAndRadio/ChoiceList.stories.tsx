import type { Story } from "@ladle/react";

import { ChoiceList } from "@kiesraad/ui";

type Props = {
  label: string;
};

export const DefaultChoiceListCheckbox: Story<Props> = ({ label }) => (
  <ChoiceList>
    <ChoiceList.Title>ChoiceList Checkbox Title</ChoiceList.Title>
    <ChoiceList.Checkbox id="default-checkbox" defaultChecked={false} label={label} />
    <ChoiceList.Checkbox id="default-checkbox-with-description" defaultChecked={false} label={label}>
      This is a description
    </ChoiceList.Checkbox>
    <ChoiceList.Checkbox id="default-checkbox-error" defaultChecked={false} label={label} hasError />
    <ChoiceList.Checkbox id="default-checkbox-disabled" defaultChecked={false} label={label} disabled />
    <ChoiceList.Checkbox id="default-checkbox-disabled-checked" defaultChecked={true} label={label} disabled />
    <div style={{ width: 200 }}>
      <ChoiceList.Checkbox id="default-checkbox-cramped" defaultChecked={false} label={label} />
    </div>
  </ChoiceList>
);

DefaultChoiceListCheckbox.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};

export const DefaultChoiceListRadio: Story<Props> = ({ label }) => (
  <ChoiceList>
    <ChoiceList.Title>ChoiceList Radio Title</ChoiceList.Title>
    <ChoiceList.Radio id="default-radio" defaultChecked={false} label={label} />
    <ChoiceList.Radio id="default-radio-with-description" defaultChecked={false} label={label}>
      This is a description
    </ChoiceList.Radio>
    <ChoiceList.Radio id="default-radio-error" defaultChecked={false} label={label} hasError />
    <ChoiceList.Radio id="default-radio-disabled" defaultChecked={false} label={label} disabled />
    <ChoiceList.Radio id="default-radio-disabled-checked" defaultChecked={true} label={label} disabled />
    <div style={{ width: 200 }}>
      <ChoiceList.Radio id="default-radio-cramped" defaultChecked={false} label={label} />
    </div>
  </ChoiceList>
);

DefaultChoiceListRadio.args = {
  label: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
};
