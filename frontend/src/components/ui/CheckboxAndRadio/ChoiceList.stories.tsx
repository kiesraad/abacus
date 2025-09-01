import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { ChoiceList } from "./ChoiceList";

type Props = {
  label: string;
  error?: string;
};

export default {
  args: {
    label: "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen.",
    error: "Dit is een verplichte vraag. Maak een keuze uit de opties hieronder.",
  },
  argTypes: {
    error: {
      control: { type: "text" },
    },
  },
} satisfies Meta<Props>;

export const DefaultChoiceListCheckbox: StoryObj<Props> = {
  render: ({ label, error }) => (
    <ChoiceList>
      <ChoiceList.Legend>ChoiceList Checkbox Legend</ChoiceList.Legend>
      {error && <ChoiceList.Error id="choicelist-error">{error}</ChoiceList.Error>}
      <ChoiceList.Checkbox id="default-checkbox" defaultChecked={false} label={label} />
      <ChoiceList.Checkbox
        id="default-checkbox-with-description"
        defaultChecked={false}
        label={`${label} (description)`}
      >
        This is a description
      </ChoiceList.Checkbox>
      <ChoiceList.Checkbox id="default-checkbox-error" defaultChecked={false} label={`${label} (error)`} hasError />
      <ChoiceList.Checkbox
        id="default-checkbox-disabled"
        defaultChecked={false}
        label={`${label} (disabled)`}
        disabled
      />
      <ChoiceList.Checkbox
        id="default-checkbox-disabled-checked"
        defaultChecked={true}
        label={`${label} (checked)`}
        disabled
      />
      <div style={{ width: 200 }}>
        <ChoiceList.Checkbox id="default-checkbox-cramped" defaultChecked={false} label={`${label} (cramped)`} />
      </div>
    </ChoiceList>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("group", { name: "ChoiceList Checkbox Legend" })).toBeVisible();
    await expect(
      canvas.getByText("Dit is een verplichte vraag. Maak een keuze uit de opties hieronder."),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("checkbox", { name: "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen." }),
    ).toBeInTheDocument();
  },
};

export const DefaultChoiceListRadio: StoryObj<Props> = {
  render: ({ label, error }) => (
    <ChoiceList>
      <ChoiceList.Legend>ChoiceList Radio Legend</ChoiceList.Legend>
      {error && <ChoiceList.Error id="choicelist-error">{error}</ChoiceList.Error>}
      <ChoiceList.Radio id="default-radio" defaultChecked={false} label={label} />
      <ChoiceList.Radio id="default-radio-with-description" defaultChecked={false} label={`${label} (description)`}>
        This is a description
      </ChoiceList.Radio>
      <ChoiceList.Radio id="default-radio-error" defaultChecked={false} label={`${label} (error)`} hasError />
      <ChoiceList.Radio id="default-radio-disabled" defaultChecked={false} label={`${label} (disabled)`} disabled />
      <ChoiceList.Radio
        id="default-radio-disabled-checked"
        defaultChecked={true}
        label={`${label} (checked)`}
        disabled
      />
      <div style={{ width: 200 }}>
        <ChoiceList.Radio id="default-radio-cramped" defaultChecked={false} label={`${label} (cramped)`} />
      </div>
    </ChoiceList>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("group", { name: "ChoiceList Radio Legend" })).toBeVisible();
    await expect(
      canvas.getByText("Dit is een verplichte vraag. Maak een keuze uit de opties hieronder."),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("radio", { name: "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen." }),
    ).toBeInTheDocument();
  },
};
