import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { useArgs } from "storybook/preview-api";
import { expect } from "storybook/test";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { InputGridSubsection, SectionValues } from "@/types/types";
import { createVotersAndVotesSection } from "@/utils/dataEntryStructure";

import { InputGridSubsectionComponent } from "./InputGridSubsection";

const inputGridSubsection = createVotersAndVotesSection(electionMockData).subsections[0] as InputGridSubsection;

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

export const InputGridWithPreviousValues: Story = {
  args: {
    setValues: () => {},
    previousValues: {
      "voters_counts.poll_card_count": "1024",
      "voters_counts.proxy_certificate_count": "32",
      "voters_counts.total_admitted_voters_count": "1056",
      "votes_counts.political_group_total_votes[0].total": "880",
      "votes_counts.political_group_total_votes[1].total": "121",
      "votes_counts.total_votes_candidates_count": "1001",
      "votes_counts.blank_votes_count": "",
      "votes_counts.invalid_votes_count": "23",
      "votes_counts.total_votes_cast_count": "1056",
    },
  },
  render: function Render(args) {
    const [{ currentValues }, updateArgs] = useArgs<{ currentValues: SectionValues }>();

    const setValues = (path: string, value: string) => {
      action("setValues")(path, value);
      updateArgs({ currentValues: { ...currentValues, [path]: value } });
    };

    return (
      <InputGridSubsectionComponent id="input-grid" {...args} currentValues={currentValues} setValues={setValues} />
    );
  },
  play: async ({ canvas }) => {
    const table = await canvas.findByTestId("input-grid");
    await expect(table).toHaveTableContent([
      ["Veld", "Eerder geteld aantal", "Geteld aantal", "Omschrijving"],
      ["A", "1.024", "", "Stempassen"],
      ["B", "32", "", "Volmachtbewijzen"],
      [""],
      ["D", "1.056", "", "Totaal toegelaten kiezers"],
      [""],
      ["E.1", "880", "", "Totaal Lijst 1 - Vurige Vleugels Partij"],
      ["E.2", "121", "", "Totaal Lijst 2 - Wijzen van Water en Wind"],
      [""],
      ["E", "1.001", "", "Totaal stemmen op kandidaten"],
      ["F", "", "", "Blanco stemmen"],
      ["G", "23", "", "Ongeldige stemmen"],
      [""],
      ["H", "1.056", "", "Totaal uitgebrachte stemmen"],
    ]);
  },
};
