import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { useArgs } from "storybook/preview-api";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { SectionValues } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { InputGridSubsectionComponent } from "./InputGridSubsection";

const inputGridSubsection = getDataEntryStructure(electionMockData)
  .flatMap((section) => section.subsections)
  .find((subsection) => subsection.type === "inputGrid")!;

const meta = {
  component: InputGridSubsectionComponent,
  parameters: {
    layout: "padded",
  },
  args: {
    subsection: inputGridSubsection,
    currentValues: {},
    defaultProps: {
      errorsAndWarningsAccepted: false,
    },
    missingTotalError: false,
    readOnly: false,
  },
} satisfies Meta<typeof InputGridSubsectionComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InputGrid: Story = {
  args: {
    setValues: () => {},
  },
  render: function Render(args) {
    const [{ currentValues }, updateArgs] = useArgs<{ currentValues: SectionValues }>();

    const setValues = (path: string, value: string) => {
      action("setValues")(path, value);
      updateArgs({ currentValues: { ...currentValues, [path]: value } });
    };

    return <InputGridSubsectionComponent {...args} currentValues={currentValues} setValues={setValues} />;
  },
};
