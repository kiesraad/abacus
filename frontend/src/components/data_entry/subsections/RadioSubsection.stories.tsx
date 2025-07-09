import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { useArgs } from "storybook/preview-api";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { SectionValues } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { RadioSubsectionComponent } from "./RadioSubsection";

const radioGridSubsection = getDataEntryStructure(electionMockData)
  .flatMap((section) => section.subsections)
  .find((subsection) => subsection.type === "radio")!;

const meta = {
  component: RadioSubsectionComponent,
  args: {
    subsection: radioGridSubsection,
    currentValues: {},
    defaultProps: {
      errorsAndWarningsAccepted: false,
    },
    readOnly: false,
  },
} satisfies Meta<typeof RadioSubsectionComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Radio: Story = {
  args: {
    setValues: () => {},
  },
  render: function Render(args) {
    const [{ currentValues }, updateArgs] = useArgs<{ currentValues: SectionValues }>();

    const setValues = (path: string, value: string) => {
      action("setValues")(path, value);
      updateArgs({ currentValues: { ...currentValues, [path]: value } });
    };

    return <RadioSubsectionComponent {...args} currentValues={currentValues} setValues={setValues} />;
  },
};
