import type { Meta, StoryObj } from "@storybook/react-vite";

import { Alert } from "@/components/ui/Alert/Alert";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ResolveDifferencesAction } from "@/types/generated/openapi";
import { getDataEntryStructureForDifferences } from "@/utils/dataEntryStructure";

import { pollingStationResultsMockData } from "../testing/polling-station-results";
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

type Props = {
  action: ResolveDifferencesAction;
};

const actions: ResolveDifferencesAction[] = ["keep_first_entry", "keep_second_entry", "discard_both_entries"];
const first = pollingStationResultsMockData(true);
const second = pollingStationResultsMockData(false);
const structure = getDataEntryStructureForDifferences(electionMockData);

export const DefaultResolveDifferencesTables: StoryObj<Props> = {
  render: ({ action }) => {
    return (
      <>
        <Alert type="notify" small>
          <p>Previewing the result of an action can be seen using the Controls below</p>
        </Alert>

        <ResolveDifferencesTables first={first} second={second} action={action} structure={structure} />
      </>
    );
  },
};

export default {
  argTypes: {
    action: {
      options: actions,
      control: { type: "radio" },
    },
  },
} satisfies Meta<Props>;
